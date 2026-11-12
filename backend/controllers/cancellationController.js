const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  Booking,
  BookingSeat,
  Passenger,
  SeatInventory,
  Cancellation,
  CancellationItem,
  Refund,
  Payment,
  Trip,
  TripStop,
  Notification,
  AuditLog
} = require('../models');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');
const { calculateSeatCancellation, getCancellationPolicy } = require('../services/policyService');

/**
 * Process Partial or Full Booking Cancellation
 * POST /api/bookings/:bookingId/cancel
 */
const cancelBookingSeats = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;
  const { bookingSeatIds, reason } = req.body;

  if (!Array.isArray(bookingSeatIds) || bookingSeatIds.length === 0) {
    return next(new AppError('bookingSeatIds must be a non-empty array of seat allocation IDs to cancel.', 400));
  }

  // 1. Fetch Booking and verify ownership
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError('Booking not found.', 404));
  }

  if (req.user.role !== 'admin' && booking.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('Forbidden. You do not have permission to cancel another customer’s booking.', 403));
  }

  // 2. Validate Booking Status
  if (booking.bookingStatus === 'cancelled') {
    return next(new AppError('This booking has already been completely cancelled.', 400));
  }

  if (booking.bookingStatus !== 'confirmed' && booking.bookingStatus !== 'partially_cancelled') {
    return next(
      new AppError(
        `Cannot cancel seats for a booking with status '${booking.bookingStatus}'. Only confirmed bookings are eligible.`,
        400
      )
    );
  }

  // 3. Fetch Trip & Determine Journey Departure Time
  const tripIdToFind = booking.tripId?._id || booking.tripId;
  const trip = await Trip.findById(tripIdToFind);
  if (!trip) {
    return next(new AppError('Associated trip schedule not found.', 404));
  }

  // 4. Validate Selected BookingSeats
  const normalizedSeatIds = bookingSeatIds.map((id) => id.toString());
  // Check for duplicate seat IDs in the request
  const uniqueSeatIds = new Set(normalizedSeatIds);
  if (uniqueSeatIds.size !== normalizedSeatIds.length) {
    return next(new AppError('Duplicate seat IDs detected in cancellation request.', 400));
  }

  const seatsToCancel = await BookingSeat.find({
    _id: { $in: Array.from(uniqueSeatIds) }
  });

  if (seatsToCancel.length !== uniqueSeatIds.size) {
    return next(new AppError('One or more selected seat allocations were not found.', 404));
  }

  // Verify all seats belong to this booking and are confirmed
  for (const s of seatsToCancel) {
    if (s.bookingId.toString() !== booking._id.toString()) {
      return next(new AppError(`Seat allocation '${s.seatNumber}' does not belong to this booking.`, 403));
    }
    if (s.allocationStatus === 'cancelled') {
      return next(new AppError(`Seat '${s.seatNumber}' is already cancelled.`, 400));
    }
    if (s.allocationStatus !== 'confirmed') {
      return next(new AppError(`Seat '${s.seatNumber}' is not in confirmed status (currently '${s.allocationStatus}').`, 400));
    }
  }

  // 5. Evaluate Cancellation Policy against Departure Time
  let departureTime = trip.departureTime;
  // If boarding stop departure time is available, use it for exact calculation
  if (seatsToCancel[0]?.boardingStopId) {
    const boardingTripStop = await TripStop.findOne({
      tripId: trip._id,
      stopId: seatsToCancel[0].boardingStopId
    });
    if (boardingTripStop && boardingTripStop.departureTime) {
      departureTime = boardingTripStop.departureTime;
    }
  }

  const now = new Date();
  let totalCancellationCharge = 0;
  let totalRefundAmount = 0;
  let policySnapshotToStore = null;
  const itemsData = [];

  for (const s of seatsToCancel) {
    const calc = calculateSeatCancellation(departureTime, s.segmentFare, now);

    if (!calc.isEligible) {
      return next(new AppError(calc.reason, 400));
    }

    policySnapshotToStore = calc.policySnapshot;
    totalCancellationCharge += calc.cancellationCharge;
    totalRefundAmount += calc.refundAmount;

    itemsData.push({
      bookingSeatId: s._id,
      cancellationCharge: calc.cancellationCharge,
      refundAmount: calc.refundAmount
    });
  }

  // Cap validation: Multiple partial cancellations cannot exceed original booking payment amount
  const existingCancellations = await Cancellation.find({ bookingId: booking._id });
  const priorRefundTotal = existingCancellations.reduce(
    (sum, c) => sum + (c.totalRefundAmount || 0),
    0
  );

  if (priorRefundTotal + totalRefundAmount > booking.totalAmount) {
    return next(
      new AppError(
        `Total cumulative refunds (₹${priorRefundTotal + totalRefundAmount}) cannot exceed original eligible payment amount (₹${booking.totalAmount}).`,
        400
      )
    );
  }

  // 6. Create Cancellation Document
  const cancellation = await Cancellation.create({
    bookingId: booking._id,
    requestedBy: req.user._id,
    cancellationStatus: 'processed',
    cancellationReason: reason ? String(reason).trim() : 'Customer requested cancellation',
    policySnapshot: policySnapshotToStore,
    totalCancellationCharge,
    totalRefundAmount,
    requestedAt: now,
    processedAt: now
  });

  // 7. Create CancellationItems
  const createdItems = await Promise.all(
    itemsData.map((item) =>
      CancellationItem.create({
        cancellationId: cancellation._id,
        bookingSeatId: item.bookingSeatId,
        cancellationCharge: item.cancellationCharge,
        refundAmount: item.refundAmount
      })
    )
  );

  // 8. Atomically update BookingSeats to 'cancelled' preventing race conditions
  const atomicSeatUpdates = await Promise.all(
    seatsToCancel.map((s) =>
      BookingSeat.findOneAndUpdate(
        { _id: s._id, allocationStatus: 'confirmed' },
        { $set: { allocationStatus: 'cancelled', cancelledAt: now } },
        { returnDocument: 'after' }
      )
    )
  );

  const failedSeatUpdates = atomicSeatUpdates.filter((s) => !s);
  if (failedSeatUpdates.length > 0) {
    // Roll back any seats successfully flipped in this racing batch
    const successfullyCancelledIds = atomicSeatUpdates.filter(Boolean).map((s) => s._id);
    if (successfullyCancelledIds.length > 0) {
      await BookingSeat.updateMany(
        { _id: { $in: successfullyCancelledIds } },
        { $set: { allocationStatus: 'confirmed', cancelledAt: null } }
      );
    }
    // Delete newly created cancellation and items to preserve strict consistency
    await CancellationItem.deleteMany({ cancellationId: cancellation._id });
    await Cancellation.findByIdAndDelete(cancellation._id);

    return next(
      new AppError(
        'Concurrency conflict: One or more selected seats have already been cancelled by another concurrent request.',
        409
      )
    );
  }

  // Release segments from SeatInventory.activeSegments so they become available immediately
  for (const s of seatsToCancel) {
    const si = await SeatInventory.findById(s.seatInventoryId);
    if (si && Array.isArray(si.activeSegments)) {
      si.activeSegments = si.activeSegments.filter(
        (seg) => seg.bookingSeatId?.toString() !== s._id.toString()
      );
      await si.save();
    }
  }

  // 9. Update Aggregate Booking Status
  const remainingConfirmedCount = await BookingSeat.countDocuments({
    bookingId: booking._id,
    allocationStatus: 'confirmed'
  });

  if (remainingConfirmedCount === 0) {
    booking.bookingStatus = 'cancelled';
    booking.cancelledAt = now;
  } else {
    booking.bookingStatus = 'partially_cancelled';
  }
  await booking.save();

  // 10. Create Refund Record (Simulated)
  let refund = null;
  if (totalRefundAmount > 0) {
    const originalPayment = await Payment.findOne({
      bookingId: booking._id,
      paymentStatus: 'successful'
    }).sort({ createdAt: -1 });

    const refundReference = `SIM_REF_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    refund = await Refund.create({
      cancellationId: cancellation._id,
      paymentId: originalPayment ? originalPayment._id : new mongoose.Types.ObjectId(),
      refundReference,
      refundAmount: totalRefundAmount,
      refundStatus: 'pending',
      provider: 'simulated_refund',
      processedAt: null
    });
  }

  // 11. Create Notification & AuditLog
  await Notification.create({
    userId: booking.userId,
    bookingId: booking._id,
    notificationType: remainingConfirmedCount === 0 ? 'BOOKING_CANCELLED' : 'BOOKING_PARTIALLY_CANCELLED',
    message: `Cancellation processed for PNR ${booking.pnr} (${seatsToCancel.length} seat(s)). Estimated refund: ₹${totalRefundAmount}.`
  }).catch(() => {});

  await AuditLog.create({
    userId: req.user._id,
    action: remainingConfirmedCount === 0 ? 'BOOKING_CANCELLED' : 'PARTIAL_CANCELLATION',
    entityType: 'Cancellation',
    entityId: cancellation._id,
    description: `Cancelled ${seatsToCancel.length} seat(s) on PNR ${booking.pnr}. Refund: ₹${totalRefundAmount}, Charge: ₹${totalCancellationCharge}`
  }).catch(() => {});

  res.status(200).json({
    status: 'success',
    message: `Successfully cancelled ${seatsToCancel.length} seat(s). Estimated refund of ₹${totalRefundAmount} has been processed.`,
    data: {
      cancellation,
      cancellationItems: createdItems,
      refund,
      updatedBooking: {
        _id: booking._id,
        pnr: booking.pnr,
        bookingStatus: booking.bookingStatus,
        totalAmount: booking.totalAmount,
        remainingConfirmedSeats: remainingConfirmedCount
      }
    }
  });
});

/**
 * List all cancellations for a specific booking
 * GET /api/bookings/:bookingId/cancellations
 */
const getBookingCancellations = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError('Booking not found.', 404));
  }

  if (req.user.role !== 'admin' && booking.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('Forbidden. You do not have permission to view cancellations for this booking.', 403));
  }

  const cancellations = await Cancellation.find({ bookingId: booking._id })
    .populate('requestedBy', 'name email')
    .sort({ createdAt: -1 });

  // Enrich with cancellation items and refunds
  const enriched = await Promise.all(
    cancellations.map(async (c) => {
      const [items, refund] = await Promise.all([
        CancellationItem.find({ cancellationId: c._id }).populate({
          path: 'bookingSeatId',
          select: 'seatNumber segmentFare passengerId fromSequence toSequence',
          populate: { path: 'passengerId', select: 'fullName age gender' }
        }),
        Refund.findOne({ cancellationId: c._id })
      ]);

      return {
        ...c.toObject(),
        items,
        refund
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: {
      cancellations: enriched,
      bookingStatus: booking.bookingStatus
    }
  });
});

/**
 * Get detailed cancellation by cancellation ID
 * GET /api/cancellations/:cancellationId
 */
const getCancellationById = asyncHandler(async (req, res, next) => {
  const { cancellationId } = req.params;

  const cancellation = await Cancellation.findById(cancellationId).populate('bookingId');
  if (!cancellation) {
    return next(new AppError('Cancellation record not found.', 404));
  }

  if (
    req.user.role !== 'admin' &&
    cancellation.bookingId?.userId?.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('Forbidden. You do not have permission to view this cancellation.', 403));
  }

  const [items, refund] = await Promise.all([
    CancellationItem.find({ cancellationId: cancellation._id }).populate({
      path: 'bookingSeatId',
      populate: { path: 'passengerId' }
    }),
    Refund.findOne({ cancellationId: cancellation._id })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      cancellation,
      items,
      refund
    }
  });
});

module.exports = {
  cancelBookingSeats,
  getBookingCancellations,
  getCancellationById
};
