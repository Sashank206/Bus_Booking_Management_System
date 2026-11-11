const {
  Trip,
  TripStop,
  RouteStop,
  Bus,
  Route,
  SeatInventory,
  Booking,
  BookingSeat,
  Notification,
  AuditLog
} = require('../models');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');
const { verifyOperatorOwnership } = require('../middleware/auth');

/**
 * List trips with filters (operatorId, routeId, date, status)
 * GET /api/trips
 */
const getTrips = asyncHandler(async (req, res, next) => {
  const { operatorId, routeId, date, status, page = 1, limit = 15 } = req.query;

  const query = {};

  // If authenticated operator, constrain to their own scheduled trips
  if (req.user && req.user.role === 'operator') {
    if (!req.operator) {
      return next(new AppError('Operator profile not found.', 404));
    }
    query.operatorId = req.operator._id;
  } else if (operatorId) {
    query.operatorId = operatorId;
  }

  if (routeId) {
    query.routeId = routeId;
  }

  if (status) {
    query.tripStatus = status;
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    query.travelDate = { $gte: startOfDay, $lte: endOfDay };
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [trips, total] = await Promise.all([
    Trip.find(query)
      .populate('busId', 'busNumber registrationNumber busType totalSeats seatLayout')
      .populate('operatorId', 'companyName registrationNumber contactPerson')
      .populate({
        path: 'routeId',
        select: 'routeName distanceKm estimatedDurationMinutes',
        populate: [
          { path: 'sourceStopId', select: 'stopName city state' },
          { path: 'destinationStopId', select: 'stopName city state' }
        ]
      })
      .sort({ departureTime: 1 })
      .skip(skip)
      .limit(limitNum),
    Trip.countDocuments(query)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      trips,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

/**
 * Get single trip with scheduled TripStops and SeatInventory summary
 * GET /api/trips/:tripId
 */
const getTripById = asyncHandler(async (req, res, next) => {
  const { tripId } = req.params;

  const trip = await Trip.findById(tripId)
    .populate('busId')
    .populate('operatorId', 'companyName registrationNumber contactPerson')
    .populate({
      path: 'routeId',
      populate: [
        { path: 'sourceStopId', select: 'stopName city state' },
        { path: 'destinationStopId', select: 'stopName city state' }
      ]
    });

  if (!trip) {
    return next(new AppError('Trip not found with provided ID.', 404));
  }

  const [tripStops, seatInventoryCount] = await Promise.all([
    TripStop.find({ tripId: trip._id })
      .populate('stopId', 'stopName city state address latitude longitude')
      .sort({ stopSequence: 1 }),
    SeatInventory.countDocuments({ tripId: trip._id, isActive: true })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      trip,
      tripStops,
      totalInventorySeats: seatInventoryCount
    }
  });
});

/**
 * Schedule a new trip, generate TripStops and initialize SeatInventory
 * POST /api/trips
 */
const createTrip = asyncHandler(async (req, res, next) => {
  const {
    busId,
    routeId,
    travelDate,
    departureTime,
    arrivalTime,
    baseFare
  } = req.body;

  const depTime = new Date(departureTime);
  const arrTime = new Date(arrivalTime);

  // 1. Fetch and validate Bus
  const bus = await Bus.findById(busId);
  if (!bus) {
    return next(new AppError('Selected bus not found.', 404));
  }
  if (!bus.isActive) {
    return next(new AppError('Cannot schedule a trip with an inactive bus.', 400));
  }

  // 2. Validate Operator Ownership & Approval
  let operatorId;
  if (req.user.role === 'operator') {
    if (!req.operator) {
      return next(new AppError('Operator profile required to schedule trips.', 404));
    }
    if (req.operator.approvalStatus !== 'approved') {
      return next(
        new AppError(
          `Operator access restricted. Your profile status is '${req.operator.approvalStatus}'. Administrator approval is required before scheduling trips.`,
          403
        )
      );
    }
    if (bus.operatorId.toString() !== req.operator._id.toString()) {
      return next(new AppError('Forbidden. You do not own this bus.', 403));
    }
    operatorId = req.operator._id;
  } else if (req.user.role === 'admin') {
    operatorId = bus.operatorId;
  } else {
    return next(new AppError('Unauthorized role for trip scheduling.', 403));
  }

  // 3. Fetch and validate Route
  const route = await Route.findById(routeId);
  if (!route) {
    return next(new AppError('Selected route not found.', 404));
  }
  if (!route.isActive) {
    return next(new AppError('Cannot schedule a trip on an inactive route.', 400));
  }

  // 4. Prevent conflicting bus schedule (Time overlap check on same physical vehicle)
  // Overlap condition: depTime < existingArr && arrTime > existingDep
  const conflictingTrip = await Trip.findOne({
    busId: bus._id,
    tripStatus: { $ne: 'cancelled' },
    departureTime: { $lt: arrTime },
    arrivalTime: { $gt: depTime }
  });

  if (conflictingTrip) {
    return next(
      new AppError(
        `Schedule conflict detected: Bus '${bus.busNumber}' is already assigned to a trip departing at ${conflictingTrip.departureTime.toISOString()} and arriving at ${conflictingTrip.arrivalTime.toISOString()}.`,
        409
      )
    );
  }

  // 5. Fetch RouteStops
  const routeStops = await RouteStop.find({ routeId: route._id }).sort({ stopSequence: 1 });
  if (!routeStops || routeStops.length < 2) {
    return next(new AppError('Route does not have enough stops configured (minimum 2 required).', 400));
  }

  // 6. Create Trip document & dependents with rollback protection
  let trip;
  try {
    trip = await Trip.create({
      busId: bus._id,
      operatorId,
      routeId: route._id,
      travelDate: new Date(travelDate),
      departureTime: depTime,
      arrivalTime: arrTime,
      baseFare: parseFloat(baseFare),
      tripStatus: 'scheduled'
    });

    // 7. Generate TripStops from RouteStops
    const totalDurationMs = arrTime.getTime() - depTime.getTime();
    const maxDistance = routeStops[routeStops.length - 1].distanceFromStart || 1;

    const tripStopDocs = routeStops.map((rs, index) => {
      let stopDep;
      let stopArr;

      if (index === 0) {
        stopArr = depTime;
        stopDep = depTime;
      } else if (index === routeStops.length - 1) {
        stopArr = arrTime;
        stopDep = arrTime;
      } else {
        // Linear interpolation based on distanceFromStart or stopSequence ratio
        const ratio = rs.distanceFromStart
          ? rs.distanceFromStart / maxDistance
          : index / (routeStops.length - 1);
        const estTime = new Date(depTime.getTime() + totalDurationMs * ratio);
        stopArr = estTime;
        stopDep = new Date(estTime.getTime() + 5 * 60 * 1000); // 5 minute boarding stop
      }

      return {
        tripId: trip._id,
        stopId: rs.stopId,
        stopSequence: rs.stopSequence,
        arrivalTime: stopArr,
        departureTime: stopDep
      };
    });

    await TripStop.insertMany(tripStopDocs);

    // 8. Generate SeatInventory records for every seat in the bus layout
    const seatInventoryDocs = bus.seatLayout.seats.map((seat) => ({
      tripId: trip._id,
      seatNumber: seat.seatNumber,
      seatType: seat.seatType || 'seater',
      isActive: true,
      activeSegments: []
    }));

    await SeatInventory.insertMany(seatInventoryDocs);

    // 9. Record audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'TRIP_SCHEDULED',
      entityType: 'Trip',
      entityId: trip._id,
      description: `Trip scheduled on route '${route.routeName}' with bus '${bus.busNumber}' (${seatInventoryDocs.length} seats) by operator`,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent']
    }).catch((err) => console.warn('[Audit Warning] Could not record trip scheduling:', err.message));

    return res.status(201).json({
      status: 'success',
      message: `Trip scheduled successfully with ${tripStopDocs.length} scheduled stops and ${seatInventoryDocs.length} seat inventory records initialized.`,
      data: {
        trip,
        totalStops: tripStopDocs.length,
        totalSeats: seatInventoryDocs.length
      }
    });
  } catch (creationError) {
    if (trip && trip._id) {
      await Promise.allSettled([
        Trip.findByIdAndDelete(trip._id),
        TripStop.deleteMany({ tripId: trip._id }),
        SeatInventory.deleteMany({ tripId: trip._id })
      ]);
    }
    throw creationError;
  }
});

/**
 * Cancel a trip
 * PATCH /api/trips/:tripId/cancel
 */
const cancelTrip = asyncHandler(async (req, res, next) => {
  const { tripId } = req.params;
  const { reason } = req.body || {};

  const trip = await Trip.findById(tripId);
  if (!trip) {
    return next(new AppError('Trip not found.', 404));
  }

  if (!verifyOperatorOwnership(trip.operatorId, req)) {
    return next(new AppError('Forbidden. You do not own this trip schedule.', 403));
  }

  if (trip.tripStatus === 'cancelled') {
    return next(new AppError('Trip is already cancelled.', 400));
  }

  trip.tripStatus = 'cancelled';
  await trip.save();

  // Deactivate seat inventory for this cancelled trip
  await SeatInventory.updateMany({ tripId: trip._id }, { isActive: false });

  // Update confirmed and pending bookings to cancelled
  const affectedBookings = await Booking.find({
    tripId: trip._id,
    bookingStatus: { $in: ['confirmed', 'pending', 'partially_cancelled'] }
  });

  if (affectedBookings.length > 0) {
    const bookingIds = affectedBookings.map((b) => b._id);

    await Booking.updateMany(
      { _id: { $in: bookingIds } },
      { bookingStatus: 'cancelled' }
    );

    await BookingSeat.updateMany(
      { bookingId: { $in: bookingIds } },
      { allocationStatus: 'cancelled' }
    );

    const notifications = affectedBookings.map((b) => ({
      userId: b.userId,
      bookingId: b._id,
      notificationType: 'TRIP_CANCELLED',
      message: `Your bus trip with PNR ${b.pnr} on ${trip.departureTime.toLocaleDateString()} has been cancelled by the operator. Reason: ${reason || 'Operational cancellation'}.`,
      deliveryStatus: 'sent'
    }));

    await Notification.insertMany(notifications).catch((err) =>
      console.warn('[Notification Warning] Could not record passenger cancellation notifications:', err.message)
    );
  }

  await AuditLog.create({
    userId: req.user._id,
    action: 'TRIP_CANCELLED',
    entityType: 'Trip',
    entityId: trip._id,
    description: `Trip scheduled for ${trip.departureTime.toISOString()} cancelled. Reason: ${reason || 'Operator cancellation'}`,
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  }).catch((err) => console.warn('[Audit Warning] Could not record trip cancellation:', err.message));

  res.status(200).json({
    status: 'success',
    message: 'Trip has been marked cancelled and seat inventory closed.',
    data: { trip }
  });
});

/**
 * Get Passenger Manifest for a trip
 * GET /api/trips/:tripId/manifest
 */
const getTripManifest = asyncHandler(async (req, res, next) => {
  const { tripId } = req.params;

  const trip = await Trip.findById(tripId)
    .populate('busId', 'busNumber registrationNumber busType')
    .populate('routeId', 'routeName');

  if (!trip) {
    return next(new AppError('Trip not found.', 404));
  }

  if (!verifyOperatorOwnership(trip.operatorId, req)) {
    return next(new AppError('Forbidden. You do not have permission to view this manifest.', 403));
  }

  // Find all confirmed/active booking seats for this trip
  const bookings = await Booking.find({
    tripId: trip._id,
    bookingStatus: { $in: ['confirmed', 'partially_cancelled'] }
  }).select('_id pnr userId bookingStatus totalAmount');

  const bookingIds = bookings.map((b) => b._id);

  const bookingSeats = await BookingSeat.find({
    bookingId: { $in: bookingIds },
    allocationStatus: 'confirmed'
  })
    .populate('passengerId', 'fullName age gender phone email')
    .populate('boardingStopId', 'stopName city')
    .populate('droppingStopId', 'stopName city')
    .sort({ seatNumber: 1 });

  const manifest = bookingSeats.map((bs) => {
    const parentBooking = bookings.find((b) => b._id.toString() === bs.bookingId.toString());
    return {
      seatNumber: bs.seatNumber,
      pnr: parentBooking ? parentBooking.pnr : '—',
      passenger: bs.passengerId,
      boardingStop: bs.boardingStopId,
      droppingStop: bs.droppingStopId,
      fromSequence: bs.fromSequence,
      toSequence: bs.toSequence,
      fare: bs.segmentFare,
      status: bs.allocationStatus
    };
  });

  res.status(200).json({
    status: 'success',
    data: {
      trip,
      totalPassengers: manifest.length,
      manifest
    }
  });
});

module.exports = {
  getTrips,
  getTripById,
  createTrip,
  cancelTrip,
  getTripManifest
};
