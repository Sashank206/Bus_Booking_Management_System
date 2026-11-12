const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  Booking,
  BookingSeat,
  Passenger,
  SeatInventory,
  Payment,
  Trip,
  Notification,
  AuditLog
} = require('../models');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Simulate Customer Payment (Success or Failure)
 * POST /api/payments/simulate
 */
const simulatePayment = asyncHandler(async (req, res, next) => {
  const {
    bookingId,
    idempotencyKey,
    simulationAction = 'success',
    paymentMethod = 'simulated_card'
  } = req.body;

  if (!bookingId) {
    return next(new AppError('Booking ID is required for payment simulation.', 400));
  }

  if (!idempotencyKey) {
    return next(new AppError('Idempotency key is required to guarantee payment idempotency.', 400));
  }

  if (!['success', 'failure'].includes(simulationAction)) {
    return next(new AppError("simulationAction must be either 'success' or 'failure'.", 400));
  }

  // 1. Fetch Booking and verify ownership
  const booking = await Booking.findById(bookingId).populate({
    path: 'tripId',
    populate: [
      { path: 'busId', select: 'busNumber registrationNumber busType' },
      { path: 'operatorId', select: 'companyName contactPerson' },
      {
        path: 'routeId',
        populate: [
          { path: 'sourceStopId', select: 'stopName city state' },
          { path: 'destinationStopId', select: 'stopName city state' }
        ]
      }
    ]
  });

  if (!booking) {
    return next(new AppError('Booking not found with provided ID.', 404));
  }

  // Enforce customer ownership isolation (or admin)
  if (req.user.role !== 'admin' && booking.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('Forbidden. You do not have permission to pay for another customer’s booking.', 403));
  }

  // Verify idempotency key is not stolen or reused across a different booking
  const existingKeyPayment = await Payment.findOne({ idempotencyKey });
  if (
    existingKeyPayment &&
    existingKeyPayment.bookingId?.toString() !== booking._id.toString()
  ) {
    return next(
      new AppError(
        'This idempotency key has already been used for a different booking transaction.',
        409
      )
    );
  }

  // 2. Check Idempotency & Booking Status
  let payment = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });

  if (booking.bookingStatus === 'confirmed') {
    if (payment && (payment.idempotencyKey === idempotencyKey || payment.paymentStatus === 'successful')) {
      // Idempotent replay: already confirmed under this payment/idempotency key
      return res.status(200).json({
        status: 'success',
        message: 'Payment has already been processed and booking confirmed (idempotent replay).',
        data: {
          booking,
          payment,
          isDuplicate: true
        }
      });
    }
    return next(new AppError('This booking is already confirmed and fully paid for.', 400));
  }

  if (booking.bookingStatus === 'expired') {
    return next(new AppError('This booking reservation has expired. Held seats have been released.', 400));
  }

  if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'partially_cancelled') {
    return next(new AppError(`Cannot pay for a booking in '${booking.bookingStatus}' status.`, 400));
  }

  if (booking.bookingStatus !== 'pending_payment') {
    return next(new AppError(`Cannot process payment for booking in '${booking.bookingStatus}' status.`, 400));
  }

  // 3. Verify Associated Seat Holds Validity
  const now = new Date();
  const bookingSeats = await BookingSeat.find({ bookingId: booking._id });

  if (!bookingSeats || bookingSeats.length === 0) {
    return next(new AppError('No seat allocations found for this booking.', 400));
  }

  const hasExpiredHold = bookingSeats.some(
    (bs) => bs.allocationStatus === 'held' && bs.holdExpiresAt && new Date(bs.holdExpiresAt) <= now
  );

  if (hasExpiredHold) {
    // Automatically transition to expired and release residual holds
    booking.bookingStatus = 'expired';
    await booking.save();

    for (const bs of bookingSeats) {
      bs.allocationStatus = 'expired';
      await bs.save();

      // Release from SeatInventory
      const si = await SeatInventory.findById(bs.seatInventoryId);
      if (si && Array.isArray(si.activeSegments)) {
        si.activeSegments = si.activeSegments.filter(
          (seg) => seg.bookingSeatId?.toString() !== bs._id.toString()
        );
        await si.save();
      }
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'BOOKING_EXPIRED',
      entityType: 'Booking',
      entityId: booking._id,
      description: `Payment rejected because seat hold expired for PNR ${booking.pnr}`
    }).catch(() => {});

    return next(
      new AppError(
        'Your 10-minute seat hold has expired. The seats have been released. Please select your seats again.',
        400
      )
    );
  }

  // 4. Process Simulation Action: SUCCESS
  if (simulationAction === 'success') {
    const paymentRef = `SIM_TXN_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    // A. Update or create Payment
    if (payment) {
      payment.paymentStatus = 'successful';
      payment.paymentReference = paymentRef;
      payment.idempotencyKey = idempotencyKey;
      payment.paymentMethod = paymentMethod;
      payment.paymentAmount = booking.totalAmount;
      payment.paidAt = now;
      await payment.save();
    } else {
      payment = await Payment.create({
        bookingId: booking._id,
        paymentReference: paymentRef,
        idempotencyKey,
        paymentMethod,
        paymentAmount: booking.totalAmount,
        paymentStatus: 'successful',
        provider: 'simulated_gateway',
        paidAt: now
      });
    }

    // B. Confirm Booking (Atomic conditional transition prevents double-processing races)
    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, bookingStatus: 'pending_payment' },
      { $set: { bookingStatus: 'confirmed', confirmedAt: now } },
      { returnDocument: 'after' }
    );

    if (!updatedBooking) {
      // Concurrently confirmed or processed by a racing request
      const reloaded = await Booking.findById(booking._id);
      if (reloaded && reloaded.bookingStatus === 'confirmed') {
        const existingPayment = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
        return res.status(200).json({
          status: 'success',
          message: 'Payment has already been processed and booking confirmed (concurrent replay).',
          data: {
            booking: reloaded,
            payment: existingPayment || payment,
            isDuplicate: true
          }
        });
      }
      return next(
        new AppError(`Cannot confirm payment for booking in '${reloaded?.bookingStatus || 'unknown'}' status.`, 400)
      );
    }

    booking.bookingStatus = 'confirmed';
    booking.confirmedAt = now;

    // C. Confirm BookingSeats & SeatInventory.activeSegments
    for (const bs of bookingSeats) {
      bs.allocationStatus = 'confirmed';
      bs.confirmedAt = now;
      await bs.save();

      const si = await SeatInventory.findById(bs.seatInventoryId);
      if (si && Array.isArray(si.activeSegments)) {
        for (const seg of si.activeSegments) {
          if (
            seg.bookingSeatId?.toString() === bs._id.toString() ||
            (seg.fromSequence === bs.fromSequence && seg.toSequence === bs.toSequence && seg.status === 'held')
          ) {
            seg.status = 'confirmed';
            seg.holdExpiresAt = null;
          }
        }
        await si.save();
      }
    }

    // D. Create Notification
    await Notification.create({
      userId: booking.userId,
      bookingId: booking._id,
      notificationType: 'BOOKING_CONFIRMED',
      message: `Your booking for trip with PNR ${booking.pnr} has been confirmed! Total: ₹${booking.totalAmount}.`
    }).catch(() => {});

    // E. Create AuditLog
    await AuditLog.create({
      userId: req.user._id,
      action: 'PAYMENT_SUCCESS',
      entityType: 'Booking',
      entityId: booking._id,
      description: `Simulated payment successful for PNR ${booking.pnr} (₹${booking.totalAmount}, Ref: ${paymentRef})`
    }).catch(() => {});

    const [passengers, populatedSeats] = await Promise.all([
      Passenger.find({ bookingId: booking._id }),
      BookingSeat.find({ bookingId: booking._id })
        .populate('boardingStopId', 'stopName city')
        .populate('droppingStopId', 'stopName city')
    ]);

    return res.status(200).json({
      status: 'success',
      message: `Simulated payment completed successfully! Your booking with PNR '${booking.pnr}' is confirmed.`,
      data: {
        booking,
        payment,
        passengers,
        bookingSeats: populatedSeats
      }
    });
  }

  // 5. Process Simulation Action: FAILURE
  const failRef = `SIM_FAIL_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  // A. Update or create Payment as failed
  if (payment) {
    payment.paymentStatus = 'failed';
    payment.paymentReference = failRef;
    payment.idempotencyKey = idempotencyKey;
    payment.paymentMethod = paymentMethod;
    await payment.save();
  } else {
    payment = await Payment.create({
      bookingId: booking._id,
      paymentReference: failRef,
      idempotencyKey,
      paymentMethod,
      paymentAmount: booking.totalAmount,
      paymentStatus: 'failed',
      provider: 'simulated_gateway'
    });
  }

  // B. Mark booking as failed
  booking.bookingStatus = 'failed';
  await booking.save();

  // C. Release BookingSeats and SeatInventory holds
  for (const bs of bookingSeats) {
    bs.allocationStatus = 'released';
    await bs.save();

    const si = await SeatInventory.findById(bs.seatInventoryId);
    if (si && Array.isArray(si.activeSegments)) {
      si.activeSegments = si.activeSegments.filter(
        (seg) => seg.bookingSeatId?.toString() !== bs._id.toString()
      );
      await si.save();
    }
  }

  // D. Create Notification & AuditLog
  await Notification.create({
    userId: booking.userId,
    bookingId: booking._id,
    notificationType: 'PAYMENT_FAILED',
    message: `Simulated payment failed for booking with PNR ${booking.pnr}. All held seats have been released.`
  }).catch(() => {});

  await AuditLog.create({
    userId: req.user._id,
    action: 'PAYMENT_FAILED',
    entityType: 'Booking',
    entityId: booking._id,
    description: `Simulated payment failed for PNR ${booking.pnr}. Seats released.`
  }).catch(() => {});

  return res.status(200).json({
    status: 'fail',
    message: 'Simulated payment failed. All held seats have been released back to inventory.',
    data: {
      booking,
      payment
    }
  });
});

/**
 * Get payment by Payment ID
 * GET /api/payments/:paymentId
 */
const getPaymentById = asyncHandler(async (req, res, next) => {
  const { paymentId } = req.params;

  const payment = await Payment.findById(paymentId).populate({
    path: 'bookingId',
    select: 'pnr totalAmount bookingStatus userId'
  });

  if (!payment) {
    return next(new AppError('Payment record not found.', 404));
  }

  // Ownership check
  if (req.user.role !== 'admin' && payment.bookingId?.userId?.toString() !== req.user._id.toString()) {
    return next(new AppError('Forbidden. You do not have permission to view this payment.', 403));
  }

  res.status(200).json({
    status: 'success',
    data: { payment }
  });
});

/**
 * Get payment for a specific booking
 * GET /api/bookings/:bookingId/payment
 */
const getBookingPayment = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError('Booking not found.', 404));
  }

  if (req.user.role !== 'admin' && booking.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('Forbidden. You do not have permission to view this booking payment.', 403));
  }

  const payment = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: {
      payment: payment || null,
      bookingStatus: booking.bookingStatus,
      totalAmount: booking.totalAmount
    }
  });
});

module.exports = {
  simulatePayment,
  getPaymentById,
  getBookingPayment
};

