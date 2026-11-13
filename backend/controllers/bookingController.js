const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  User,
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
const { getCancellationPolicy } = require('../services/policyService');
const { updateTripLifecycleStatuses } = require('../services/tripLifecycleService');

/**
 * Mask phone number for public privacy
 */
function maskPhone(phone) {
  if (!phone) return 'N/A';
  const clean = String(phone).trim();
  if (clean.length <= 4) return '***';
  return clean.slice(0, 2) + '*'.repeat(Math.max(1, clean.length - 6)) + clean.slice(-4);
}

/**
 * Mask email address for public privacy
 */
function maskEmail(email) {
  if (!email) return 'N/A';
  const parts = String(email).trim().split('@');
  if (parts.length !== 2) return '***';
  const user = parts[0];
  const domain = parts[1];
  const maskedUser = user.length <= 2 ? user[0] + '***' : user[0] + '***' + user.slice(-1);
  return `${maskedUser}@${domain}`;
}

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
 * Diagnostic logger for booking conflict events
 * Records diagnostic attributes without logging credentials or private tokens
 */
function logBookingConflict({
  requestId,
  tripId,
  customerId,
  seatNumbers = [],
  boardingStopId,
  droppingStopId,
  holdToken,
  bookingId,
  idempotencyKey,
  code,
  reason,
  statusCode = 409
}) {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    event: 'BOOKING_CONFLICT_DIAGNOSTIC',
    requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tripId: tripId ? tripId.toString() : null,
    customerId: customerId ? customerId.toString() : null,
    seatNumbers: Array.isArray(seatNumbers) ? seatNumbers : [],
    boardingStopId: boardingStopId ? boardingStopId.toString() : null,
    droppingStopId: droppingStopId ? droppingStopId.toString() : null,
    holdToken: holdToken ? String(holdToken) : null,
    bookingId: bookingId ? bookingId.toString() : null,
    idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
    conflictCode: code,
    conflictReason: reason,
    statusCode
  };
  console.warn('[BOOKING CONFLICT DIAGNOSTIC]', JSON.stringify(diagnostic));
}

/**
 * Acquire Atomic 10-Minute Seat Holds
 * POST /api/bookings/hold
 */
const holdSeats = asyncHandler(async (req, res, next) => {
  const { tripId, seatNumbers, boardingStopId, droppingStopId } = req.body;
  const requestId = req.id || req.headers['x-request-id'] || null;
  const customerId = req.user?._id;
  const normalizedSeats = Array.isArray(seatNumbers)
    ? seatNumbers.map((s) => s.trim().toUpperCase())
    : [];

  // 1. Validate Trip
  const trip = await Trip.findById(tripId).populate('busId');
  if (!trip) {
    return next(new AppError('Selected trip does not exist.', 404));
  }
  if (trip.tripStatus !== 'scheduled') {
    logBookingConflict({
      requestId,
      tripId,
      customerId,
      seatNumbers: normalizedSeats,
      boardingStopId,
      droppingStopId,
      code: 'TRIP_NOT_BOOKABLE',
      reason: `Cannot hold seats for a trip with status '${trip.tripStatus}'`,
      statusCode: 409
    });
    return next(
      new AppError(
        `This trip is no longer accepting bookings because its status is '${trip.tripStatus}'.`,
        409,
        null,
        'TRIP_NOT_BOOKABLE'
      )
    );
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
  const totalAmount = seatFare * normalizedSeats.length;

  // 3. Atomic Conditional Seat Hold Acquisition (All-or-Nothing)
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
      logBookingConflict({
        requestId,
        tripId,
        customerId,
        seatNumbers: [sNum],
        boardingStopId,
        droppingStopId,
        holdToken,
        code: 'SEAT_ALREADY_BOOKED',
        reason: `Seat '${sNum}' is already held or booked for an overlapping segment`,
        statusCode: 409
      });
      return next(
        new AppError(
          `Sorry, seat '${sNum}' has already been booked by another passenger. Please choose another seat.`,
          409,
          null,
          'SEAT_ALREADY_BOOKED'
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
    holdToken,
    idempotencyKey: bodyIdempotencyKey
  } = req.body;

  const idempotencyKey = bodyIdempotencyKey || req.headers['idempotency-key'] || null;
  const requestId = req.id || req.headers['x-request-id'] || null;
  const customerId = req.user?._id;
  const requestedSeats = Array.isArray(passengers)
    ? passengers.map((p) => (p.seatNumber || '').trim().toUpperCase())
    : [];

  const recordConflict = (code, reason, status = 409, extraBookingId = null) => {
    logBookingConflict({
      requestId,
      tripId,
      customerId,
      seatNumbers: requestedSeats,
      boardingStopId,
      droppingStopId,
      holdToken,
      bookingId: extraBookingId,
      idempotencyKey,
      code,
      reason,
      statusCode: status
    });
  };

  // 1. Validate Trip
  const trip = await Trip.findById(tripId)
    .populate('busId')
    .populate('operatorId')
    .populate('routeId');

  if (!trip) {
    return next(new AppError('Trip schedule not found.', 404));
  }
  if (trip.tripStatus !== 'scheduled') {
    recordConflict('TRIP_NOT_BOOKABLE', `Cannot book seats for a trip with status '${trip.tripStatus}'`);
    return next(
      new AppError(
        `This trip is no longer accepting bookings because its status is '${trip.tripStatus}'.`,
        409,
        null,
        'TRIP_NOT_BOOKABLE'
      )
    );
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

  // 3. Idempotency Key & Existing Booking Verification
  if (idempotencyKey) {
    const existingByIdempotency = await Booking.findOne({ idempotencyKey });
    if (existingByIdempotency) {
      if (existingByIdempotency.userId.toString() !== customerId.toString()) {
        recordConflict(
          'IDEMPOTENCY_KEY_CONFLICT',
          `Idempotency key '${idempotencyKey}' was previously used for a different booking transaction.`
        );
        return next(
          new AppError(
            'This idempotency key has already been used for a different booking transaction.',
            409,
            null,
            'IDEMPOTENCY_KEY_CONFLICT'
          )
        );
      }

      // Duplicate booking submission by same customer
      recordConflict(
        'BOOKING_ALREADY_PROCESSED',
        `Booking ${existingByIdempotency.pnr} already exists for this idempotency key`,
        409,
        existingByIdempotency._id
      );
      return next(
        new AppError(
          'Your booking is already being processed. Please check My Bookings.',
          409,
          null,
          'BOOKING_ALREADY_PROCESSED'
        )
      );
    }
  }

  if (holdToken) {
    const existingByHold = await Booking.findOne({ holdToken });
    if (existingByHold) {
      recordConflict(
        'BOOKING_ALREADY_PROCESSED',
        `Booking ${existingByHold.pnr} already exists for holdToken '${holdToken}'`,
        409,
        existingByHold._id
      );
      return next(
        new AppError(
          'Your booking is already being processed. Please check My Bookings.',
          409,
          null,
          'BOOKING_ALREADY_PROCESSED'
        )
      );
    }
  }

  // 4. Calculate fare per seat
  const maxSeq = tripStops.length > 1 ? tripStops[tripStops.length - 1].stopSequence : 1;
  const segmentRatio = Math.min(1, Math.max(0.3, (toSequence - fromSequence) / Math.max(1, maxSeq)));
  const segmentFare = Math.round(trip.baseFare * segmentRatio);
  const totalAmount = segmentFare * passengers.length;

  // 5. Verify Seat Availability & Active Hold Status
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

    const activeSegs = Array.isArray(si.activeSegments) ? si.activeSegments : [];
    const overlappingSegs = activeSegs.filter(
      (seg) => seg.fromSequence < toSequence && seg.toSequence > fromSequence
    );

    // A. Check for overlapping confirmed allocation
    const confirmedSeg = overlappingSegs.find((seg) => seg.status === 'confirmed');
    if (confirmedSeg) {
      recordConflict(
        'SEAT_ALREADY_BOOKED',
        `Seat '${sNum}' is already confirmed on overlapping segment [${confirmedSeg.fromSequence}, ${confirmedSeg.toSequence})`
      );
      return next(
        new AppError(
          `Sorry, seat '${sNum}' has already been booked by another passenger. Please choose another seat.`,
          409,
          null,
          'SEAT_ALREADY_BOOKED'
        )
      );
    }

    // B. Check for overlapping held segments
    const heldSegs = overlappingSegs.filter((seg) => seg.status === 'held');

    if (heldSegs.length > 0) {
      for (const hSeg of heldSegs) {
        const isExpired = hSeg.holdExpiresAt && new Date(hSeg.holdExpiresAt) <= now;

        if (isExpired) {
          if (holdToken && hSeg.holdToken === holdToken) {
            recordConflict(
              'SEAT_HOLD_EXPIRED',
              `Seat hold on '${sNum}' has expired (holdExpiresAt: ${hSeg.holdExpiresAt})`
            );
            return next(
              new AppError(
                'Your seat hold has expired. Please select your seats again.',
                409,
                null,
                'SEAT_HOLD_EXPIRED'
              )
            );
          }
          continue;
        }

        // Active unexpired hold!
        // Enforce user ownership: hold cannot be claimed by a different user
        if (hSeg.heldByUserId && customerId && hSeg.heldByUserId.toString() !== customerId.toString()) {
          recordConflict(
            'SEAT_HOLD_NOT_OWNED',
            `Seat '${sNum}' is held by another user account (${hSeg.heldByUserId})`
          );
          return next(
            new AppError(
              'This seat hold belongs to another customer account.',
              409,
              null,
              'SEAT_HOLD_NOT_OWNED'
            )
          );
        }

        const isHeldByMe =
          (hSeg.heldByUserId && customerId && hSeg.heldByUserId.toString() === customerId.toString()) ||
          (holdToken && hSeg.holdToken === holdToken);

        if (!isHeldByMe) {
          recordConflict(
            'SEAT_HOLD_NOT_OWNED',
            `Seat '${sNum}' is held by another user account (${hSeg.heldByUserId})`
          );
          return next(
            new AppError(
              'This seat hold belongs to another customer account.',
              409,
              null,
              'SEAT_HOLD_NOT_OWNED'
            )
          );
        }

        if (holdToken && hSeg.holdToken && hSeg.holdToken !== holdToken) {
          recordConflict(
            'SEAT_HOLD_MISMATCH',
            `Seat '${sNum}' hold token '${hSeg.holdToken}' does not match requested token '${holdToken}'`
          );
          return next(
            new AppError(
              'Selected seats do not match the held seats for this reservation.',
              409,
              null,
              'SEAT_HOLD_MISMATCH'
            )
          );
        }
      }
    } else if (holdToken) {
      // User passed a holdToken, but this specific seat does not have a hold
      const otherSeatWithToken = await SeatInventory.findOne({
        tripId: trip._id,
        'activeSegments.holdToken': holdToken
      });
      if (otherSeatWithToken) {
        recordConflict(
          'SEAT_HOLD_MISMATCH',
          `Seat '${sNum}' was not held under holdToken '${holdToken}'`
        );
        return next(
          new AppError(
            'Selected seats do not match the held seats for this reservation.',
            409,
            null,
            'SEAT_HOLD_MISMATCH'
          )
        );
      } else {
        recordConflict(
          'SEAT_HOLD_EXPIRED',
          `Hold token '${holdToken}' not found on any seat for trip ${trip._id}`
        );
        return next(
          new AppError(
            'Your seat hold has expired. Please select your seats again.',
            409,
            null,
            'SEAT_HOLD_EXPIRED'
          )
        );
      }
    }

    // C. General segment availability verification
    const isAvail = si.isAvailableForSegment
      ? si.isAvailableForSegment(fromSequence, toSequence, now)
      : true;

    const hasOnlyMyHold =
      heldSegs.length > 0 &&
      heldSegs.every((seg) => {
        const isExpired = seg.holdExpiresAt && new Date(seg.holdExpiresAt) <= now;
        if (isExpired) return true;
        return (
          (seg.heldByUserId && customerId && seg.heldByUserId.toString() === customerId.toString()) ||
          (holdToken && seg.holdToken === holdToken)
        );
      });

    if (!isAvail && !hasOnlyMyHold) {
      recordConflict(
        'SEAT_ALREADY_BOOKED',
        `Seat '${sNum}' is unavailable for booking on segment [${fromSequence}, ${toSequence})`
      );
      return next(
        new AppError(
          `Sorry, seat '${sNum}' has already been booked by another passenger. Please choose another seat.`,
          409,
          null,
          'SEAT_ALREADY_BOOKED'
        )
      );
    }

    seatInventories.push({ passenger: p, seatInventory: si, sNum });
  }

  // 6. Generate unique PNR
  const pnr = await generateUniquePNR();
  const holdExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  // 7. Multi-Document Atomic Creation with Compensational Rollback
  let booking;
  const createdPassengers = [];
  const createdBookingSeats = [];

  try {
    booking = await Booking.create({
      pnr,
      userId: req.user._id,
      tripId: trip._id,
      bookingStatus: 'pending_payment',
      totalAmount,
      bookingDate: now,
      holdToken: holdToken || undefined,
      idempotencyKey: idempotencyKey || undefined
    });

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
        si.activeSegments = si.activeSegments.filter(
          (seg) =>
            !(
              (holdToken && seg.holdToken === holdToken) ||
              (seg.status === 'held' &&
                seg.fromSequence === fromSequence &&
                seg.toSequence === toSequence &&
                seg.heldByUserId?.toString() === customerId.toString())
            )
        );
        si.activeSegments.push({
          bookingSeatId: bookingSeatDoc._id,
          fromSequence,
          toSequence,
          status: 'held',
          holdExpiresAt,
          holdToken: holdToken || undefined,
          heldByUserId: req.user._id,
          createdAt: now
        });
        await si.save();
      }
    }

    // Initialize Pending Payment
    const paymentIdempotencyKey = `PAY_${pnr}_INIT_${Date.now()}`;
    await Payment.create({
      bookingId: booking._id,
      paymentReference: `SIM_REF_${pnr}`,
      idempotencyKey: paymentIdempotencyKey,
      paymentMethod: 'simulated_card',
      paymentAmount: totalAmount,
      paymentStatus: 'pending',
      provider: 'simulated_gateway'
    });

    // Record Audit Log
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
    if (booking && booking._id) {
      await Promise.allSettled([
        Booking.findByIdAndDelete(booking._id),
        Passenger.deleteMany({ bookingId: booking._id }),
        BookingSeat.deleteMany({ bookingId: booking._id }),
        Payment.deleteMany({ bookingId: booking._id })
      ]);
    }
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || '';
      if (field === 'idempotencyKey') {
        recordConflict('IDEMPOTENCY_KEY_CONFLICT', 'Duplicate idempotency key conflict');
        return next(
          new AppError(
            'This idempotency key has already been used for a different booking transaction.',
            409,
            null,
            'IDEMPOTENCY_KEY_CONFLICT'
          )
        );
      }
      if (field === 'holdToken' || field === 'pnr') {
        recordConflict('BOOKING_ALREADY_PROCESSED', 'Duplicate booking submission for holdToken');
        return next(
          new AppError(
            'Your booking is already being processed. Please check My Bookings.',
            409,
            null,
            'BOOKING_ALREADY_PROCESSED'
          )
        );
      }
    }
    throw err;
  }
});

/**
 * List Customer Bookings History
 * GET /api/bookings/my-bookings
 */
const getMyBookings = asyncHandler(async (req, res, next) => {
  // Authoritatively refresh trip lifecycle transitions (scheduled -> boarding -> in_progress -> completed)
  await updateTripLifecycleStatuses().catch((err) =>
    console.warn('[Trip Lifecycle Refresh Warning]', err.message)
  );

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

  const policy = getCancellationPolicy();

  res.status(200).json({
    status: 'success',
    data: {
      booking,
      trip,
      passengers,
      bookingSeats,
      payment,
      policySummary: {
        cutoffHours: policy.cutoffHours,
        policyName: policy.policyName,
        tiers: policy.tiers
      },
      qrPayload: `BUSGO|${booking.pnr}|${booking._id}|${booking.tripId}|${booking.totalAmount}|${booking.bookingStatus}`
    }
  });
});

/**
 * Public/Safe PNR Ticket Verification Endpoint
 * GET /api/bookings/verify/:pnr
 */
const verifyTicketByPNR = asyncHandler(async (req, res, next) => {
  const { pnr } = req.params;
  if (!pnr) {
    return next(new AppError('PNR is required for ticket verification.', 400));
  }

  const booking = await Booking.findOne({ pnr: pnr.trim().toUpperCase() })
    .populate({
      path: 'tripId',
      populate: [
        { path: 'busId', select: 'busNumber registrationNumber busType amenities' },
        { path: 'operatorId', select: 'companyName contactPerson' },
        {
          path: 'routeId',
          populate: [
            { path: 'sourceStopId', select: 'stopName city state' },
            { path: 'destinationStopId', select: 'stopName city state' }
          ]
        }
      ]
    })
    .populate('userId', 'name email phone');

  if (!booking) {
    return next(new AppError('No booking found for the provided PNR.', 404));
  }

  const [passengers, bookingSeats, payment] = await Promise.all([
    Passenger.find({ bookingId: booking._id }).select('fullName gender age seatNumber'),
    BookingSeat.find({ bookingId: booking._id })
      .populate('boardingStopId', 'stopName city')
      .populate('droppingStopId', 'stopName city'),
    Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 })
  ]);

  let userDoc = booking.userId;
  if (!userDoc || !userDoc.email || !userDoc.phone) {
    const rawUserId = userDoc?._id || userDoc;
    if (rawUserId) {
      const found = await User.findById(rawUserId);
      if (found) userDoc = found;
    }
  }

  // Mask sensitive user contact information to protect privacy on public verification
  const isOwner =
    req.user &&
    (req.user._id?.toString() === (userDoc?._id || userDoc)?.toString() || req.user.role === 'admin');

  const maskedContact = {
    name: userDoc?.name || 'Customer',
    email: isOwner ? userDoc?.email : maskEmail(userDoc?.email),
    phone: isOwner ? userDoc?.phone : maskPhone(userDoc?.phone)
  };

  const verificationData = {
    pnr: booking.pnr,
    bookingStatus: booking.bookingStatus,
    journeyDate: booking.journeyDate,
    totalAmount: booking.totalAmount,
    createdAt: booking.createdAt,
    confirmedAt: booking.confirmedAt,
    customer: maskedContact,
    trip: {
      tripId: booking.tripId?._id,
      departureTime: booking.tripId?.departureTime,
      arrivalTime: booking.tripId?.arrivalTime,
      operatorName: booking.tripId?.operatorId?.companyName || 'BusGo Partner Operator',
      busNumber: booking.tripId?.busId?.busNumber || 'N/A',
      busType: booking.tripId?.busId?.busType || 'Standard',
      sourceStop: booking.tripId?.routeId?.sourceStopId?.stopName,
      sourceCity: booking.tripId?.routeId?.sourceStopId?.city,
      destinationStop: booking.tripId?.routeId?.destinationStopId?.stopName,
      destinationCity: booking.tripId?.routeId?.destinationStopId?.city
    },
    seats: bookingSeats.map((bs) => ({
      seatNumber: bs.seatNumber,
      status: bs.allocationStatus,
      fare: bs.segmentFare,
      boardingStop: bs.boardingStopId?.stopName,
      droppingStop: bs.droppingStopId?.stopName
    })),
    passengers: passengers.map((p) => ({
      fullName: p.fullName,
      gender: p.gender,
      age: p.age,
      seatNumber: p.seatNumber
    })),
    payment: payment
      ? {
          paymentStatus: payment.paymentStatus,
          paymentMethod: payment.paymentMethod,
          paidAt: payment.paidAt
        }
      : null,
    qrPayload: `BUSGO|${booking.pnr}|${booking.tripId?._id}|${booking.bookingStatus}|${booking.totalAmount}`
  };

  res.status(200).json({
    status: 'success',
    data: verificationData
  });
});

/**
 * Get Comprehensive Confirmed Ticket Details
 * GET /api/bookings/:bookingId/ticket
 */
const getBookingTicket = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;

  let booking;
  if (mongoose.Types.ObjectId.isValid(bookingId)) {
    booking = await Booking.findById(bookingId);
  } else {
    booking = await Booking.findOne({ pnr: bookingId.toUpperCase() });
  }

  if (!booking) {
    return next(new AppError('Booking not found.', 404));
  }

  // Customer ownership check (or admin)
  if (req.user.role !== 'admin' && booking.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('Forbidden. You do not have permission to access this ticket.', 403));
  }

  const [trip, passengers, bookingSeats, payment, bookingUser] = await Promise.all([
    Trip.findById(booking.tripId)
      .populate('busId', 'busNumber registrationNumber busType amenities')
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
    Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 }),
    req.user
  ]);

  const policy = getCancellationPolicy();

  const ticketData = {
    ticketId: `TKT-${booking.pnr}`,
    pnr: booking.pnr,
    bookingStatus: booking.bookingStatus,
    journeyDate: trip?.travelDate || booking.journeyDate || trip?.departureTime || booking.bookingDate,
    totalAmount: booking.totalAmount,
    createdAt: booking.createdAt,
    confirmedAt: booking.confirmedAt,
    customer: {
      userId: bookingUser._id,
      name: bookingUser.name,
      email: bookingUser.email,
      phone: bookingUser.phone
    },
    trip: {
      _id: trip?._id,
      travelDate: trip?.travelDate,
      departureTime: trip?.departureTime,
      arrivalTime: trip?.arrivalTime,
      operatorName: trip?.operatorId?.companyName,
      busNumber: trip?.busId?.busNumber,
      registrationNumber: trip?.busId?.registrationNumber,
      busType: trip?.busId?.busType,
      amenities: trip?.busId?.amenities,
      source: trip?.routeId?.sourceStopId,
      destination: trip?.routeId?.destinationStopId
    },
    boardingStop: bookingSeats[0]?.boardingStopId || trip?.routeId?.sourceStopId,
    droppingStop: bookingSeats[0]?.droppingStopId || trip?.routeId?.destinationStopId,
    passengers,
    bookingSeats,
    payment,
    policySummary: {
      cutoffHours: policy.cutoffHours,
      policyName: policy.policyName,
      tiers: policy.tiers
    },
    qrPayload: `BUSGO|${booking.pnr}|${booking._id}|${booking.tripId}|${booking.totalAmount}|${booking.bookingStatus}`
  };

  res.status(200).json({
    status: 'success',
    data: ticketData
  });
});

/**
 * System/Cron: Cleanup Expired Pending Bookings and Release Seat Holds
 * POST /api/bookings/cleanup-expired
 */
const cleanupExpiredBookings = asyncHandler(async (req, res, next) => {
  const now = new Date();

  // Find all pending_payment bookings whose hold has expired
  const expiredBookings = await Booking.find({
    bookingStatus: 'pending_payment',
    holdExpiresAt: { $lt: now }
  });

  let releasedSeatsCount = 0;

  for (const b of expiredBookings) {
    b.bookingStatus = 'expired';
    await b.save();

    const seats = await BookingSeat.find({ bookingId: b._id, allocationStatus: 'held' });
    for (const seat of seats) {
      seat.allocationStatus = 'expired';
      await seat.save();

      const si = await SeatInventory.findById(seat.seatInventoryId);
      if (si && Array.isArray(si.activeSegments)) {
        si.activeSegments = si.activeSegments.filter(
          (seg) => seg.bookingSeatId?.toString() !== seat._id.toString()
        );
        await si.save();
        releasedSeatsCount++;
      }
    }
  }

  // Also clean up orphan holds in SeatInventory where holdExpiresAt < now and status === 'held'
  const inventoriesWithExpiredHolds = await SeatInventory.find({
    'activeSegments.status': 'held',
    'activeSegments.holdExpiresAt': { $lt: now }
  });

  for (const inv of inventoriesWithExpiredHolds) {
    const beforeCount = inv.activeSegments.length;
    inv.activeSegments = inv.activeSegments.filter(
      (seg) => !(seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) < now)
    );
    if (inv.activeSegments.length !== beforeCount) {
      releasedSeatsCount += beforeCount - inv.activeSegments.length;
      await inv.save();
    }
  }

  res.status(200).json({
    status: 'success',
    message: `Cleaned up ${expiredBookings.length} expired bookings and released ${releasedSeatsCount} seat segments.`,
    data: {
      cleanedCount: expiredBookings.length,
      releasedSeats: releasedSeatsCount
    }
  });
});

module.exports = {
  holdSeats,
  releaseHold,
  createBooking,
  getMyBookings,
  getBookingById,
  verifyTicketByPNR,
  getBookingTicket,
  cleanupExpiredBookings
};

