const { Bus, Trip, AuditLog } = require('../models');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');
const { verifyOperatorOwnership } = require('../middleware/auth');

/**
 * List buses with filtering, search, and pagination
 * GET /api/buses
 */
const getBuses = asyncHandler(async (req, res, next) => {
  const { search, isActive, busType, page = 1, limit = 10 } = req.query;

  const query = {};

  // If user is operator, restrict strictly to their own fleet
  if (req.user.role === 'operator') {
    if (!req.operator) {
      return next(new AppError('Operator profile not found.', 404));
    }
    query.operatorId = req.operator._id;
  } else if (req.query.operatorId && req.user.role === 'admin') {
    // Admin filtering by specific operator
    query.operatorId = req.query.operatorId;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (busType) {
    query.busType = busType;
  }

  if (search) {
    query.$or = [
      { busNumber: { $regex: search, $options: 'i' } },
      { busName: { $regex: search, $options: 'i' } },
      { registrationNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [buses, total] = await Promise.all([
    Bus.find(query)
      .populate('operatorId', 'companyName registrationNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Bus.countDocuments(query)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      buses,
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
 * Get details of a single bus
 * GET /api/buses/:busId
 */
const getBusById = asyncHandler(async (req, res, next) => {
  const { busId } = req.params;

  const bus = await Bus.findById(busId).populate('operatorId', 'companyName registrationNumber');
  if (!bus) {
    return next(new AppError('Bus not found with provided ID.', 404));
  }

  // Operator ownership isolation
  if (!verifyOperatorOwnership(bus.operatorId._id || bus.operatorId, req)) {
    return next(new AppError('Forbidden. You do not have permission to access another operator\'s fleet.', 403));
  }

  res.status(200).json({
    status: 'success',
    data: { bus }
  });
});

/**
 * Register a new bus and define seat layout
 * POST /api/buses
 */
const createBus = asyncHandler(async (req, res, next) => {
  if (!req.operator) {
    return next(new AppError('Operator profile required to register a bus.', 404));
  }

  const {
    busNumber,
    busName,
    busType,
    registrationNumber,
    totalSeats,
    seatLayout,
    amenities
  } = req.body;

  const normalizedReg = registrationNumber.trim().toUpperCase();

  // Check duplicate registrationNumber
  const existingBus = await Bus.findOne({ registrationNumber: normalizedReg });
  if (existingBus) {
    return next(
      new AppError(
        `A bus with registration number '${normalizedReg}' is already registered in the system.`,
        409
      )
    );
  }

  // Normalize seat numbers in layout
  const normalizedSeats = seatLayout.seats.map((s) => ({
    ...s,
    seatNumber: s.seatNumber.trim().toUpperCase()
  }));

  const bus = await Bus.create({
    operatorId: req.operator._id,
    busNumber,
    busName,
    busType,
    registrationNumber: normalizedReg,
    totalSeats: parseInt(totalSeats, 10),
    seatLayout: {
      ...seatLayout,
      seats: normalizedSeats
    },
    amenities: amenities || [],
    isActive: true
  });

  // Audit log
  await AuditLog.create({
    userId: req.user._id,
    action: 'BUS_CREATED',
    entityType: 'Bus',
    entityId: bus._id,
    description: `Bus '${bus.busNumber}' (${bus.registrationNumber}, ${bus.totalSeats} seats) registered by ${req.operator.companyName}`,
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  }).catch((err) => console.warn('[Audit Warning] Could not record bus creation:', err.message));

  res.status(201).json({
    status: 'success',
    message: 'Bus successfully registered with configured seat layout.',
    data: { bus }
  });
});

/**
 * Update bus configuration and seat layout
 * PUT /api/buses/:busId
 */
const updateBus = asyncHandler(async (req, res, next) => {
  const { busId } = req.params;

  const bus = await Bus.findById(busId);
  if (!bus) {
    return next(new AppError('Bus not found.', 404));
  }

  // Enforce operator ownership
  if (!verifyOperatorOwnership(bus.operatorId, req)) {
    return next(new AppError('Forbidden. You do not own this bus.', 403));
  }

  const {
    busNumber,
    busName,
    busType,
    registrationNumber,
    totalSeats,
    seatLayout,
    amenities,
    isActive
  } = req.body;

  if (registrationNumber) {
    const normalizedReg = registrationNumber.trim().toUpperCase();
    if (normalizedReg !== bus.registrationNumber) {
      const conflict = await Bus.findOne({ registrationNumber: normalizedReg, _id: { $ne: bus._id } });
      if (conflict) {
        return next(new AppError(`Registration number '${normalizedReg}' is already taken by another bus.`, 409));
      }
      bus.registrationNumber = normalizedReg;
    }
  }

  // Prevent modifying seat layout or capacity if bus has active upcoming scheduled trips
  const isModifyingLayout =
    (totalSeats && parseInt(totalSeats, 10) !== bus.totalSeats) ||
    Boolean(seatLayout);

  if (isModifyingLayout) {
    const activeTripsCount = await Trip.countDocuments({
      busId: bus._id,
      tripStatus: 'scheduled',
      departureTime: { $gte: new Date() }
    });

    if (activeTripsCount > 0) {
      return next(
        new AppError(
          `Cannot modify seat layout or capacity for bus '${bus.busNumber}'. It is currently assigned to ${activeTripsCount} active upcoming scheduled trip(s). Cancel or complete existing trips before altering cabin layout.`,
          409
        )
      );
    }
  }

  if (busNumber) bus.busNumber = busNumber;
  if (busName !== undefined) bus.busName = busName;
  if (busType) bus.busType = busType;
  if (totalSeats) bus.totalSeats = parseInt(totalSeats, 10);
  if (amenities) bus.amenities = amenities;
  if (isActive !== undefined) bus.isActive = isActive;

  if (seatLayout && seatLayout.seats) {
    bus.seatLayout = {
      ...seatLayout,
      seats: seatLayout.seats.map((s) => ({
        ...s,
        seatNumber: s.seatNumber.trim().toUpperCase()
      }))
    };
  }

  await bus.save();

  // Audit log
  await AuditLog.create({
    userId: req.user._id,
    action: 'BUS_UPDATED',
    entityType: 'Bus',
    entityId: bus._id,
    description: `Bus '${bus.busNumber}' updated by operator`,
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  }).catch((err) => console.warn('[Audit Warning] Could not record bus update:', err.message));

  res.status(200).json({
    status: 'success',
    message: 'Bus details updated successfully.',
    data: { bus }
  });
});

/**
 * Toggle bus active/inactive status
 * PATCH /api/buses/:busId/status
 */
const toggleBusStatus = asyncHandler(async (req, res, next) => {
  const { busId } = req.params;

  const bus = await Bus.findById(busId);
  if (!bus) {
    return next(new AppError('Bus not found.', 404));
  }

  if (!verifyOperatorOwnership(bus.operatorId, req)) {
    return next(new AppError('Forbidden. You do not own this bus.', 403));
  }

  bus.isActive = !bus.isActive;
  await bus.save();

  await AuditLog.create({
    userId: req.user._id,
    action: bus.isActive ? 'BUS_ACTIVATED' : 'BUS_DEACTIVATED',
    entityType: 'Bus',
    entityId: bus._id,
    description: `Bus '${bus.busNumber}' status toggled to isActive=${bus.isActive}`,
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  }).catch((err) => console.warn('[Audit Warning] Could not record bus status change:', err.message));

  res.status(200).json({
    status: 'success',
    message: `Bus '${bus.busNumber}' has been ${bus.isActive ? 'activated' : 'deactivated'}.`,
    data: { bus }
  });
});

module.exports = {
  getBuses,
  getBusById,
  createBus,
  updateBus,
  toggleBusStatus
};

