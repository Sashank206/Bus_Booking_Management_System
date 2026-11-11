const mongoose = require('mongoose');
const {
  Trip,
  TripStop,
  RouteStop,
  Bus,
  Stop,
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

/**
 * Customer Search Trips by Origin, Destination, and Travel Date
 * GET /api/trips/search
 */
const searchTrips = asyncHandler(async (req, res, next) => {
  const from = (req.query.from || req.query.origin || '').trim();
  const to = (req.query.to || req.query.destination || '').trim();
  const date = (req.query.date || req.query.travelDate || '').trim();
  const {
    busType,
    operatorId,
    minFare,
    maxFare,
    sortBy = 'departureTime',
    page = 1,
    limit = 10
  } = req.query;

  if (!from || !to || !date) {
    return next(new AppError('Origin stop, destination stop, and travel date are required for trip search.', 400));
  }

  if (from === to) {
    return next(new AppError('Origin and destination cannot be the exact same stop.', 400));
  }

  // 1. Resolve origin and destination stops
  const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;

  const originQuery = isValidObjectId(from)
    ? { _id: from }
    : { $or: [{ stopName: { $regex: from, $options: 'i' } }, { city: { $regex: from, $options: 'i' } }] };

  const destQuery = isValidObjectId(to)
    ? { _id: to }
    : { $or: [{ stopName: { $regex: to, $options: 'i' } }, { city: { $regex: to, $options: 'i' } }] };

  const [originStops, destStops] = await Promise.all([
    Stop.find(originQuery),
    Stop.find(destQuery)
  ]);

  if (!originStops || originStops.length === 0 || !destStops || destStops.length === 0) {
    return res.status(200).json({
      status: 'success',
      data: {
        trips: [],
        total: 0,
        page: parseInt(page, 10) || 1,
        pages: 0,
        message: 'No stops found matching the requested origin or destination.'
      }
    });
  }

  const originStopIds = originStops.map((s) => s._id.toString());
  const destStopIds = destStops.map((s) => s._id.toString());

  // Check if explicit origin and destination stop IDs are identical
  const hasExactSameStop = originStopIds.some((oId) => destStopIds.includes(oId));
  if (hasExactSameStop && originStopIds.length === 1 && destStopIds.length === 1) {
    return next(new AppError('Origin and destination cannot be the exact same stop.', 400));
  }

  // 2. Query trips operating on the given date with scheduled status
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const tripQuery = {
    travelDate: { $gte: startOfDay, $lte: endOfDay },
    tripStatus: 'scheduled'
  };

  if (operatorId) {
    tripQuery.operatorId = operatorId;
  }

  const candidateTrips = await Trip.find(tripQuery)
    .populate('busId', 'busNumber registrationNumber busType totalSeats seatLayout amenities')
    .populate('operatorId', 'companyName registrationNumber contactPerson rating')
    .populate({
      path: 'routeId',
      populate: [
        { path: 'sourceStopId', select: 'stopName city state' },
        { path: 'destinationStopId', select: 'stopName city state' }
      ]
    });

  if (!candidateTrips || candidateTrips.length === 0) {
    return res.status(200).json({
      status: 'success',
      data: {
        trips: [],
        total: 0,
        page: parseInt(page, 10) || 1,
        pages: 0
      }
    });
  }

  const tripIds = candidateTrips.map((t) => t._id);

  // 3. Fetch all TripStops for candidate trips
  const allTripStops = await TripStop.find({ tripId: { $in: tripIds } })
    .populate('stopId', 'stopName city state latitude longitude')
    .sort({ stopSequence: 1 });

  // 4. Fetch all SeatInventory for candidate trips
  const allSeatInventories = await SeatInventory.find({
    tripId: { $in: tripIds },
    isActive: true
  });

  const now = new Date();
  const matchingTrips = [];

  for (const trip of candidateTrips) {
    const stopsForTrip = allTripStops.filter((ts) => ts.tripId.toString() === trip._id.toString());

    // Find origin stop and dest stop in this trip's stops
    const originTs = stopsForTrip.find((ts) => originStopIds.includes((ts.stopId?._id || ts.stopId)?.toString()));
    const destTs = stopsForTrip.find((ts) => destStopIds.includes((ts.stopId?._id || ts.stopId)?.toString()));

    if (!originTs || !destTs) continue;

    // Validate that origin sequence is strictly before destination sequence
    if (originTs.stopSequence >= destTs.stopSequence) {
      continue;
    }

    const fromSequence = originTs.stopSequence;
    const toSequence = destTs.stopSequence;

    // Filter by busType if specified
    if (busType && trip.busId?.busType && !trip.busId.busType.toLowerCase().includes(busType.toLowerCase())) {
      continue;
    }

    // Departure and arrival at the specific boarding and dropping stops
    const boardingTime = originTs.departureTime || trip.departureTime;
    const droppingTime = destTs.arrivalTime || trip.arrivalTime;
    const durationMinutes = Math.max(1, Math.round((new Date(droppingTime) - new Date(boardingTime)) / (60 * 1000)));

    // Calculate segment fare based on sequence ratio
    const maxSequence = stopsForTrip.length > 1 ? stopsForTrip[stopsForTrip.length - 1].stopSequence : 1;
    const segmentRatio = Math.min(1, Math.max(0.3, (toSequence - fromSequence) / Math.max(1, maxSequence)));
    const calculatedFare = Math.round(trip.baseFare * segmentRatio);

    if (minFare && calculatedFare < parseFloat(minFare)) continue;
    if (maxFare && calculatedFare > parseFloat(maxFare)) continue;

    // Count available seats for [fromSequence, toSequence)
    const tripSeatInventories = allSeatInventories.filter((si) => si.tripId.toString() === trip._id.toString());
    let availableSeatsCount = 0;

    for (const seat of tripSeatInventories) {
      if (typeof seat.isAvailableForSegment === 'function') {
        if (seat.isAvailableForSegment(fromSequence, toSequence, now)) {
          availableSeatsCount++;
        }
      } else {
        const isAvail = !seat.activeSegments || seat.activeSegments.every((seg) => {
          if (seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) <= now) return true;
          return !(seg.fromSequence < toSequence && seg.toSequence > fromSequence);
        });
        if (isAvail) availableSeatsCount++;
      }
    }

    matchingTrips.push({
      _id: trip._id,
      operator: trip.operatorId,
      bus: trip.busId,
      route: trip.routeId,
      travelDate: trip.travelDate,
      boardingStop: {
        stopId: originTs.stopId?._id || originTs.stopId,
        stopName: originTs.stopId?.stopName || 'Boarding Point',
        city: originTs.stopId?.city,
        sequence: fromSequence,
        departureTime: boardingTime
      },
      droppingStop: {
        stopId: destTs.stopId?._id || destTs.stopId,
        stopName: destTs.stopId?.stopName || 'Dropping Point',
        city: destTs.stopId?.city,
        sequence: toSequence,
        arrivalTime: droppingTime
      },
      durationMinutes,
      fare: calculatedFare,
      baseFare: trip.baseFare,
      totalSeats: trip.busId?.totalSeats || tripSeatInventories.length,
      availableSeats: availableSeatsCount
    });
  }

  // Sorting
  if (sortBy === 'fare') {
    matchingTrips.sort((a, b) => a.fare - b.fare);
  } else if (sortBy === 'duration') {
    matchingTrips.sort((a, b) => a.durationMinutes - b.durationMinutes);
  } else if (sortBy === 'availableSeats') {
    matchingTrips.sort((a, b) => b.availableSeats - a.availableSeats);
  } else {
    // Default departure time
    matchingTrips.sort((a, b) => new Date(a.boardingStop.departureTime) - new Date(b.boardingStop.departureTime));
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const total = matchingTrips.length;
  const paginated = matchingTrips.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.status(200).json({
    status: 'success',
    data: {
      trips: paginated,
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
 * Get Seat Availability Map for a Trip and Segment
 * GET /api/trips/:tripId/seats
 */
const getTripSeatAvailability = asyncHandler(async (req, res, next) => {
  const { tripId } = req.params;
  const { fromStopId, toStopId } = req.query;

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
    return next(new AppError('Trip not found.', 404));
  }

  // Retrieve stops for this trip
  const tripStops = await TripStop.find({ tripId: trip._id })
    .populate('stopId', 'stopName city state')
    .sort({ stopSequence: 1 });

  let fromSequence = 0;
  let toSequence = tripStops.length > 1 ? tripStops[tripStops.length - 1].stopSequence : 1;
  let boardingStop = tripStops[0]?.stopId;
  let droppingStop = tripStops[tripStops.length - 1]?.stopId;
  let departureTime = trip.departureTime;
  let arrivalTime = trip.arrivalTime;

  if (fromStopId && toStopId) {
    const originTs = tripStops.find((ts) => (ts.stopId?._id || ts.stopId).toString() === fromStopId.toString());
    const destTs = tripStops.find((ts) => (ts.stopId?._id || ts.stopId).toString() === toStopId.toString());

    if (!originTs || !destTs) {
      return next(new AppError('Specified boarding or dropping stop is not valid for this trip schedule.', 404));
    }

    if (originTs.stopSequence >= destTs.stopSequence) {
      return next(new AppError('Dropping stop must be positioned after boarding stop in sequence.', 400));
    }

    fromSequence = originTs.stopSequence;
    toSequence = destTs.stopSequence;
    boardingStop = originTs.stopId;
    droppingStop = destTs.stopId;
    departureTime = originTs.departureTime || trip.departureTime;
    arrivalTime = destTs.arrivalTime || trip.arrivalTime;
  }

  // Calculate segment fare ratio
  const maxSeq = tripStops.length > 1 ? tripStops[tripStops.length - 1].stopSequence : 1;
  const segmentRatio = Math.min(1, Math.max(0.3, (toSequence - fromSequence) / Math.max(1, maxSeq)));
  const segmentFare = Math.round(trip.baseFare * segmentRatio);

  // Retrieve SeatInventory records
  const seatInventories = await SeatInventory.find({ tripId: trip._id });
  const seatInventoryMap = new Map();
  seatInventories.forEach((si) => {
    seatInventoryMap.set(si.seatNumber.toUpperCase(), si);
  });

  const now = new Date();
  const seatsWithAvailability = [];
  let availableCount = 0;

  // Use bus.seatLayout if defined
  const busSeats = trip.busId?.seatLayout?.seats || [];

  for (const layoutSeat of busSeats) {
    const sNum = layoutSeat.seatNumber.toUpperCase();
    const inv = seatInventoryMap.get(sNum);

    let isAvailable = false;
    let holdExpiresAt = null;

    if (inv && inv.isActive) {
      if (typeof inv.isAvailableForSegment === 'function') {
        isAvailable = inv.isAvailableForSegment(fromSequence, toSequence, now);
      } else {
        isAvailable = !inv.activeSegments || inv.activeSegments.every((seg) => {
          if (seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) <= now) return true;
          return !(seg.fromSequence < toSequence && seg.toSequence > fromSequence);
        });
      }

      const heldSeg = inv.activeSegments?.find(
        (seg) => seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) > now
      );
      if (heldSeg) {
        holdExpiresAt = heldSeg.holdExpiresAt;
      }
    }

    if (isAvailable) {
      availableCount++;
    }

    seatsWithAvailability.push({
      seatNumber: sNum,
      row: layoutSeat.row,
      col: layoutSeat.col,
      deck: layoutSeat.deck || 1,
      seatType: layoutSeat.seatType || 'seater',
      fare: segmentFare,
      isAvailable,
      holdExpiresAt
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      trip: {
        _id: trip._id,
        operator: trip.operatorId,
        bus: trip.busId,
        route: trip.routeId,
        travelDate: trip.travelDate
      },
      segment: {
        boardingStop,
        droppingStop,
        fromSequence,
        toSequence,
        departureTime,
        arrivalTime,
        segmentFare
      },
      seatLayout: {
        rows: trip.busId?.seatLayout?.rows || 10,
        columns: trip.busId?.seatLayout?.columns || 4,
        deckCount: trip.busId?.seatLayout?.deckCount || 1,
        seats: seatsWithAvailability
      },
      availableSeatsCount: availableCount,
      totalSeats: seatsWithAvailability.length
    }
  });
});

module.exports = {
  getTrips,
  searchTrips,
  getTripSeatAvailability,
  getTripById,
  createTrip,
  cancelTrip,
  getTripManifest
};
