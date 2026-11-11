const { Stop, AuditLog } = require('../models');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * List stops with filtering, search, and pagination
 * GET /api/stops
 */
const getStops = asyncHandler(async (req, res, next) => {
  const { search, city, isActive, page, limit } = req.query;

  const query = {};
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (city) {
    query.city = { $regex: city, $options: 'i' };
  }

  if (search) {
    query.$or = [
      { stopName: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
      { state: { $regex: search, $options: 'i' } }
    ];
  }

  // If pagination requested
  if (page || limit) {
    const pageNum = Math.max(1, parseInt(page || 1, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || 20, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [stops, total] = await Promise.all([
      Stop.find(query).sort({ city: 1, stopName: 1 }).skip(skip).limit(limitNum),
      Stop.countDocuments(query)
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        stops,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  }

  // Non-paginated query (for select dropdowns and map plots)
  const stops = await Stop.find(query).sort({ city: 1, stopName: 1 }).limit(100);
  res.status(200).json({
    status: 'success',
    data: { stops }
  });
});

/**
 * Get stop by ID
 * GET /api/stops/:stopId
 */
const getStopById = asyncHandler(async (req, res, next) => {
  const { stopId } = req.params;
  const stop = await Stop.findById(stopId);
  if (!stop) {
    return next(new AppError('Stop not found.', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { stop }
  });
});

/**
 * Create a new physical stop
 * POST /api/stops (Admin only)
 */
const createStop = asyncHandler(async (req, res, next) => {
  const { stopName, city, state, address, latitude, longitude } = req.body;

  const trimmedName = stopName.trim();
  const trimmedCity = city.trim();

  // Prevent duplicate stopName in the same city
  const existing = await Stop.findOne({
    stopName: { $regex: `^${trimmedName}$`, $options: 'i' },
    city: { $regex: `^${trimmedCity}$`, $options: 'i' }
  });

  if (existing) {
    return next(
      new AppError(`A stop named '${trimmedName}' in '${trimmedCity}' already exists.`, 409)
    );
  }

  const stop = await Stop.create({
    stopName: trimmedName,
    city: trimmedCity,
    state: state ? state.trim() : undefined,
    address: address ? address.trim() : undefined,
    latitude: latitude ? parseFloat(latitude) : undefined,
    longitude: longitude ? parseFloat(longitude) : undefined,
    isActive: true
  });

  await AuditLog.create({
    userId: req.user._id,
    action: 'STOP_CREATED',
    entityType: 'Stop',
    entityId: stop._id,
    description: `Stop '${stop.stopName}', ${stop.city} created by admin`,
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  }).catch((err) => console.warn('[Audit Warning] Could not record stop creation:', err.message));

  res.status(201).json({
    status: 'success',
    message: `Stop '${stop.stopName}' successfully added to catalog.`,
    data: { stop }
  });
});

/**
 * Update an existing stop
 * PUT /api/stops/:stopId (Admin only)
 */
const updateStop = asyncHandler(async (req, res, next) => {
  const { stopId } = req.params;
  const { stopName, city, state, address, latitude, longitude, isActive } = req.body;

  const stop = await Stop.findById(stopId);
  if (!stop) {
    return next(new AppError('Stop not found.', 404));
  }

  if (stopName || city) {
    const newName = (stopName || stop.stopName).trim();
    const newCity = (city || stop.city).trim();

    const conflict = await Stop.findOne({
      _id: { $ne: stop._id },
      stopName: { $regex: `^${newName}$`, $options: 'i' },
      city: { $regex: `^${newCity}$`, $options: 'i' }
    });

    if (conflict) {
      return next(new AppError(`A stop named '${newName}' in '${newCity}' already exists.`, 409));
    }

    if (stopName) stop.stopName = newName;
    if (city) stop.city = newCity;
  }

  if (state !== undefined) stop.state = state ? state.trim() : '';
  if (address !== undefined) stop.address = address ? address.trim() : '';
  if (latitude !== undefined) stop.latitude = latitude ? parseFloat(latitude) : null;
  if (longitude !== undefined) stop.longitude = longitude ? parseFloat(longitude) : null;
  if (isActive !== undefined) stop.isActive = isActive;

  await stop.save();

  await AuditLog.create({
    userId: req.user._id,
    action: 'STOP_UPDATED',
    entityType: 'Stop',
    entityId: stop._id,
    description: `Stop '${stop.stopName}' updated by admin`,
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  }).catch((err) => console.warn('[Audit Warning] Could not record stop update:', err.message));

  res.status(200).json({
    status: 'success',
    message: 'Stop details updated successfully.',
    data: { stop }
  });
});

/**
 * Toggle stop active status
 * PATCH /api/stops/:stopId/status (Admin only)
 */
const toggleStopStatus = asyncHandler(async (req, res, next) => {
  const { stopId } = req.params;

  const stop = await Stop.findById(stopId);
  if (!stop) {
    return next(new AppError('Stop not found.', 404));
  }

  stop.isActive = !stop.isActive;
  await stop.save();

  res.status(200).json({
    status: 'success',
    message: `Stop '${stop.stopName}' has been ${stop.isActive ? 'activated' : 'deactivated'}.`,
    data: { stop }
  });
});

module.exports = {
  getStops,
  getStopById,
  createStop,
  updateStop,
  toggleStopStatus
};

