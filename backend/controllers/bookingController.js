const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  Trip,
  TripStop,
  SeatInventory,
  Booking,
  Passenger,
  BookingSeat,
  Payment,
  Stop,
  AuditLog
} = require('../models');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Generate a cryptographically random, unique alphanumeric PNR (6 to 12 chars)
 * Format: 'BG' + 8 uppercase alphanumeric chars (e.g. BG8A7F4B2C)
 */
async function generateUniquePNR() {
  let isUnique = false;
  let pnr = '';
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
    pnr = `BG${randomBytes}`; // 10 chars, matches /^[A-Z0-9]{6,12}$/

    const existing = await Booking.findOne({ pnr });
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    // Fallback timestamp-based PNR
    pnr = `BG${Date.now().toString(36).toUpperCase().slice(-8)}`;
  }

  return pnr;
}

/**
 * Acquire Atomic 10-Minute Seat Holds
 * POST /api/bookings/hold
 */
const holdSeats = asyncHandler(async (req, res, next) => {
  const { tripId, seatNumbers, boardingStopId, droppingStopId } = req.body;

  // 1. Validate Trip
  const trip = await Trip.findById(tripId).populate('busId');
  if (!trip) {
    return next(new AppError('Selected trip does not exist.', 404));
  }
  if (trip.tripStatus !== 'scheduled') {
    return next(new AppError(`Cannot hold seats for a trip with status '${trip.tripStatus}'.`, 400));
  }

  // 2. Validate Boarding and Dropping Stops on this trip
  const tripStops = await TripStop.find({ tripId: trip._id })
    .populate('stopId', 'stopName city')
    .sort({ stopSequence: 1 });

  const originTs = tripStops.find(
    (ts) => (ts.stopId?._id || ts.stopId).toString() === boardingStopId.toString()
  );
  const destTs = tripStops.find(
    (ts) => (ts.stopId?._id || ts.stopId).toString() === droppingStopId.toString()
  );

  if (!originTs || !destTs) {
    return next(new AppError('Boarding or dropping stop does not exist on this scheduled journey.', 404));
  }

  if (originTs.stopSequence >= destTs.stopSequence) {
    return next(new AppError('Dropping stop must be positioned after boarding stop in route sequence.', 400));
  }

  const fromSequence = originTs.stopSequence;
  const toSequence = destTs.stopSequence;
  const now = new Date();
  const holdExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
  const holdToken = `HT_${crypto.randomBytes(12).toString('hex')}`;

  // Calculate segment fare
  const maxSeq = tripStops.length > 1 ? tripStops[tripStops.length - 1].stopSequence : 1;
  const segmentRatio = Math.min(1, Math.max(0.3, (toSequence - fromSequence) / Math.max(1, maxSeq)));
  const seatFare = Math.round(trip.baseFare * segmentRatio);
  const totalAmount = seatFare * seatNumbers.length;

  // 3. Atomic Conditional Seat Hold Acquisition (All-or-Nothing)
  const normalizedSeats = seatNumbers.map((s) => s.trim().toUpperCase());
  const successfullyHeldSeats = [];

  for (const sNum of normalizedSeats) {
    // Find SeatInventory document
    const seatInventory = await SeatInventory.findOne({
      tripId: trip._id,
      seatNumber: sNum,
      isActive: true
    });

    if (!seatInventory) {
      // Rollback holds acquired so far
      await rollbackHolds(trip._id, successfullyHeldSeats, holdToken);
      return next(new AppError(`Seat '${sNum}' does not exist in inventory for this trip.`, 404));
    }

    // Dynamic Hold Expiration Cleanup & Overlap Check
    // Expired holds do not block seats
    const isAvail = seatInventory.isAvailableForSegment
      ? seatInventory.isAvailableForSegment(fromSequence, toSequence, now)
      : (!seatInventory.activeSegments || seatInventory.activeSegments.every((seg) => {
          if (seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) <= now) return true;
          return !(seg.fromSequence < toSequence && seg.toSequence > fromSequence);
        }));

    if (!isAvail) {
      // Rollback all holds acquired for this request
      await rollbackHolds(trip._id, successfullyHeldSeats, holdToken);
      return next(
        new AppError(
          `Seat '${sNum}' is already held or booked for an overlapping segment. Please select another seat.`,
          409
        )
      );
    }

    // Append held segment atomically
    // Clean expired holds on the fly
    if (Array.isArray(seatInventory.activeSegments)) {
      seatInventory.activeSegments = seatInventory.activeSegments.filter((seg) => {
        if (seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) <= now) {
          return false;
        }
        return true;
      });
    } else {
      seatInventory.activeSegments = [];
    }

    seatInventory.activeSegments.push({
      fromSequence,
      toSequence,
      status: 'held',
      holdExpiresAt,
      holdToken,
      heldByUserId: req.user._id,
      createdAt: now
    });

    await seatInventory.save();
    successfullyHeldSeats.push(sNum);
  }

  res.status(200).json({
    status: 'success',
    message: `Successfully acquired temporary 10-minute hold on ${successfullyHeldSeats.length} seat(s).`,
    data: {
      holdToken,
      tripId: trip._id,
      heldSeats: successfullyHeldSeats,
      boardingStop: originTs.stopId,
      droppingStop: destTs.stopId,
      fromSequence,
      toSequence,
      seatFare,
      totalAmount,
      holdExpiresAt
    }
  });
});

/**
 * Helper to release acquired holds if any seat in a multi-seat request fails
 */
async function rollbackHolds(tripId, seatsToRelease, holdToken) {
  if (!seatsToRelease || seatsToRelease.length === 0) return;

  try {
    for (const seatNumber of seatsToRelease) {
      const si = await SeatInventory.findOne({ tripId, seatNumber });
      if (si && Array.isArray(si.activeSegments)) {
        si.activeSegments = si.activeSegments.filter((seg) => seg.holdToken !== holdToken);
        await si.save();
      }
    }
  } catch (err) {
    console.warn('[Hold Rollback Warning] Failed to release partial holds:', err.message);
  }
}

/**
 * Release Temporary Seat Holds (When customer deselects seats or navigates away)
 * POST /api/bookings/release-hold
 */
const releaseHold = asyncHandler(async (req, res, next) => {
  const { tripId, seatNumbers, holdToken } = req.body;

  if (!tripId) {
    return next(new AppError('Trip ID is required to release holds.', 400));
  }

  const normalizedSeats = Array.isArray(seatNumbers)
    ? seatNumbers.map((s) => s.trim().toUpperCase())
    : [];

  const query = { tripId };
  if (normalizedSeats.length > 0) {
    query.seatNumber = { $in: normalizedSeats };
  }

  const inventories = await SeatInventory.find(query);

  for (const si of inventories) {
    if (Array.isArray(si.activeSegments)) {
      si.activeSegments = si.activeSegments.filter((seg) => {
        if (seg.status !== 'held') return true;
        if (holdToken && seg.holdToken === holdToken) return false;
        if (req.user && seg.heldByUserId?.toString() === req.user._id.toString()) return false;
        return true;
      });
      await si.save();
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Temporary seat holds released successfully.'
  });
});

/**
 * Create Customer Booking with Passenger Records & PNR
 * POST /api/bookings
 */
const createBooking = asyncHandler(async (req, res, next) => {
  const {
    tripId,
    boardingStopId,
    droppingStopId,
    passengers,
    holdToken
  } = req.body;

  // 1. Validate Trip
  const trip = await Trip.findById(tripId)
    .populate('busId')
    .populate('operatorId')
    .populate('routeId');

  if (!trip) {
    return next(new AppError('Trip schedule not found.', 404));
  }
  if (trip.tripStatus !== 'scheduled') {
    return next(new AppError(`Cannot book seats for a trip with status '${trip.tripStatus}'.`, 400));
  }

  // 2. Validate Boarding and Dropping Stops
  const tripStops = await TripStop.find({ tripId: trip._id })
    .populate('stopId', 'stopName city')
    .sort({ stopSequence: 1 });

  const originTs = tripStops.find(
    (ts) => (ts.stopId?._id || ts.stopId).toString() === boardingStopId.toString()
  );
  const destTs = tripStops.find(
    (ts) => (ts.stopId?._id || ts.stopId).toString() === droppingStopId.toString()
  );

  if (!originTs || !destTs) {
    return next(new AppError('Boarding or dropping stop is not valid for this trip schedule.', 404));
  }

  if (originTs.stopSequence >= destTs.stopSequence) {
    return next(new AppError('Dropping stop must be positioned after boarding stop in sequence.', 400));
  }

  const fromSequence = originTs.stopSequence;
  const toSequence = destTs.stopSequence;
  const now = new Date();

  // 3. Calculate fare per seat
  const maxSeq = tripStops.length > 1 ? tripStops[tripStops.length - 1].stopSequence : 1;
  const segmentRatio = Math.min(1, Math.max(0.3, (toSequence - fromSequence) / Math.max(1, maxSeq)));
  const segmentFare = Math.round(trip.baseFare * segmentRatio);
  const totalAmount = segmentFare * passengers.length;

  // 4. Verify Seat Availability & Active Hold Status
  const seatInventories = [];

  for (const p of passengers) {
    const sNum = p.seatNumber.trim().toUpperCase();
    const si = await SeatInventory.findOne({
      tripId: trip._id,
      seatNumber: sNum,
      isActive: true
    });

    if (!si) {
      return next(new AppError(`Seat '${sNum}' does not exist on this bus.`, 404));
    }

    // Check if user currently holds this seat or if it is currently available
    const hasMyHold = si.activeSegments?.some(
      (seg) =>
        seg.status === 'held' &&
        seg.fromSequence === fromSequence &&
        seg.toSequence === toSequence &&
        seg.holdExpiresAt &&
        new Date(seg.holdExpiresAt) > now &&
        (seg.holdToken === holdToken || (req.user && seg.heldByUserId?.toString() === req.user._id.toString()))
    );

    if (!hasMyHold) {
      // Check general availability if no existing hold was found
      const isAvail = si.isAvailableForSegment
        ? si.isAvailableForSegment(fromSequence, toSequence, now)
        : (!si.activeSegments || si.activeSegments.every((seg) => {
            if (seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) <= now) return true;
            return !(seg.fromSequence < toSequence && seg.toSequence > fromSequence);
          }));

      if (!isAvail) {
        return next(
          new AppError(
            `Seat '${sNum}' is no longer available for booking on this segment.`,
            409
          )
        );
      }
    }

    seatInventories.push({ passenger: p, seatInventory: si, sNum });
  }

  // 5. Generate unique PNR
  const pnr = await generateUniquePNR();
  const holdExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  // 6. Multi-Document Atomic Creation with Compensational Rollback
  let booking;
  const createdPassengers = [];
  const createdBookingSeats = [];

  try {
    // A. Create Booking
    booking = await Booking.create({
      pnr,
      userId: req.user._id,
      tripId: trip._id,
      bookingStatus: 'pending_payment',
      totalAmount,
      bookingDate: now
    });

    // B. Create Passenger and BookingSeat records
    for (const item of seatInventories) {
      const pData = item.passenger;
      const si = item.seatInventory;

      const passengerDoc = await Passenger.create({
        bookingId: booking._id,
        fullName: pData.fullName.trim(),
        age: parseInt(pData.age, 10),
        gender: pData.gender.toLowerCase(),
        phone: pData.phone ? pData.phone.trim() : req.user.phone,
        email: pData.email ? pData.email.trim().toLowerCase() : req.user.email
      });
      createdPassengers.push(passengerDoc);

      const bookingSeatDoc = await BookingSeat.create({
        bookingId: booking._id,
        passengerId: passengerDoc._id,
        seatInventoryId: si._id,
        boardingStopId: originTs.stopId?._id || originTs.stopId,
        droppingStopId: destTs.stopId?._id || destTs.stopId,
        fromSequence,
        toSequence,
        seatNumber: item.sNum,
        segmentFare,
        allocationStatus: 'held',
        holdExpiresAt
      });
      createdBookingSeats.push(bookingSeatDoc);

      // Link bookingSeatId into SeatInventory.activeSegments
      if (Array.isArray(si.activeSegments)) {
        // Remove old hold for this holdToken if present
        si.activeSegments = si.activeSegments.filter((seg) => seg.holdToken !== holdToken);
        si.activeSegments.push({
          bookingSeatId: bookingSeatDoc._id,
          fromSequence,
          toSequence,
          status: 'held',
          holdExpiresAt,
          heldByUserId: req.user._id
        });
        await si.save();
      }
    }

    // C. Initialize Pending Payment record with Idempotency Key
    const idempotencyKey = `PAY_${pnr}_INIT_${Date.now()}`;
    await Payment.create({
      bookingId: booking._id,
      paymentReference: `SIM_REF_${pnr}`,
      idempotencyKey,
      paymentMethod: 'simulated_card',
      paymentAmount: totalAmount,
      paymentStatus: 'pending',
      provider: 'simulated_gateway'
    });

    // D. Record Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: 'BOOKING_CREATED',
      entityType: 'Booking',
      entityId: booking._id,
      description: `Pending booking created with PNR ${pnr} for ${passengers.length} seat(s) (₹${totalAmount}) by customer`,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent']
    }).catch((err) => console.warn('[Audit Warning] Could not record booking creation:', err.message));

    res.status(201).json({
      status: 'success',
      message: `Booking created successfully with PNR '${pnr}'. Complete simulated payment within 10 minutes to confirm your seats.`,
      data: {
        booking,
        pnr,
        passengers: createdPassengers,
        bookingSeats: createdBookingSeats,
        totalAmount,
        holdExpiresAt
      }
    });
  } catch (err) {
    // Compensational Rollback on error
    if (booking && booking._id) {
      await Promise.allSettled([
        Booking.findByIdAndDelete(booking._id),
        Passenger.deleteMany({ bookingId: booking._id }),
        BookingSeat.deleteMany({ bookingId: booking._id }),
        Payment.deleteMany({ bookingId: booking._id })
      ]);
    }
    throw err;
  }
});

/**
 * List Customer Bookings History
 * GET /api/bookings/my-bookings
 */
const getMyBookings = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { userId: req.user._id };
  if (status) {
    query.bookingStatus = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate({
        path: 'tripId',
        populate: [
          { path: 'busId', select: 'busNumber registrationNumber busType' },
          { path: 'operatorId', select: 'companyName contactPerson rating' },
          {
            path: 'routeId',
            populate: [
              { path: 'sourceStopId', select: 'stopName city state' },
              { path: 'destinationStopId', select: 'stopName city state' }
            ]
          }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Booking.countDocuments(query)
  ]);

  // Enrich bookings with their passenger and seat allocations
  const enrichedBookings = await Promise.all(
    bookings.map(async (b) => {
      const [passengers, bookingSeats] = await Promise.all([
        Passenger.find({ bookingId: b._id }),
        BookingSeat.find({ bookingId: b._id })
          .populate('boardingStopId', 'stopName city state')
          .populate('droppingStopId', 'stopName city state')
      ]);

      return {
        ...b.toObject ? b.toObject() : b,
        passengers,
        bookingSeats
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: {
      bookings: enrichedBookings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1
      }
    }
  });
});

/**
 * Get Detailed Booking by ID (or PNR)
 * GET /api/bookings/:bookingId
 */
const getBookingById = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;

  let booking;
  if (mongoose.Types.ObjectId.isValid(bookingId)) {
    booking = await Booking.findById(bookingId);
  } else {
    booking = await Booking.findOne({ pnr: bookingId.toUpperCase() });
  }

  if (!booking) {
    return next(new AppError('Booking not found with provided identifier.', 404));
  }

  // Enforce customer ownership isolation (or admin)
  if (req.user.role !== 'admin' && booking.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('Forbidden. You do not have permission to view another customer’s booking.', 403));
  }

  // Populate trip details
  const [trip, passengers, bookingSeats, payment] = await Promise.all([
    Trip.findById(booking.tripId)
      .populate('busId', 'busNumber registrationNumber busType totalSeats amenities')
      .populate('operatorId', 'companyName registrationNumber contactPerson')
      .populate({
        path: 'routeId',
        populate: [
          { path: 'sourceStopId', select: 'stopName city state address' },
          { path: 'destinationStopId', select: 'stopName city state address' }
        ]
      }),
    Passenger.find({ bookingId: booking._id }),
    BookingSeat.find({ bookingId: booking._id })
      .populate('boardingStopId', 'stopName city state address')
      .populate('droppingStopId', 'stopName city state address'),
    Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      booking,
      trip,
      passengers,
      bookingSeats,
      payment
    }
  });
});

module.exports = {
  holdSeats,
  releaseHold,
  createBooking,
  getMyBookings,
  getBookingById
};

