const { Route, RouteStop, Stop, AuditLog } = require('../models');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');
const { withTransaction } = require('../config/db');

/**
 * List all routes with source/destination details and stop count
 * GET /api/routes
 */
const getRoutes = asyncHandler(async (req, res, next) => {
  const { isActive, search, sourceCity, destCity } = req.query;

  const query = {};
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (search) {
    query.routeName = { $regex: search, $options: 'i' };
  }

  const routes = await Route.find(query)
    .populate('sourceStopId', 'stopName city state')
    .populate('destinationStopId', 'stopName city state')
    .sort({ createdAt: -1 });

  // For each route, attach ordered route stops count and sequence list
  const routeIds = routes.map((r) => r._id);
  const allRouteStops = await RouteStop.find({ routeId: { $in: routeIds } })
    .populate('stopId', 'stopName city')
    .sort({ stopSequence: 1 });

  const stopsByRoute = {};
  allRouteStops.forEach((rs) => {
    if (!stopsByRoute[rs.routeId]) {
      stopsByRoute[rs.routeId] = [];
    }
    stopsByRoute[rs.routeId].push(rs);
  });

  const formatted = routes.map((r) => ({
    ...r.toObject(),
    routeStops: stopsByRoute[r._id] || []
  }));

  res.status(200).json({
    status: 'success',
    data: { routes: formatted }
  });
});

/**
 * Get route by ID with complete ordered stops
 * GET /api/routes/:routeId
 */
const getRouteById = asyncHandler(async (req, res, next) => {
  const { routeId } = req.params;

  const route = await Route.findById(routeId)
    .populate('sourceStopId', 'stopName city state address')
    .populate('destinationStopId', 'stopName city state address');

  if (!route) {
    return next(new AppError('Route not found.', 404));
  }

  const routeStops = await RouteStop.find({ routeId: route._id })
    .populate('stopId', 'stopName city state address latitude longitude')
    .sort({ stopSequence: 1 });

  res.status(200).json({
    status: 'success',
    data: {
      route,
      routeStops
    }
  });
});

/**
 * Create a new route with ordered route stops
 * POST /api/routes (Admin only)
 */
const createRoute = asyncHandler(async (req, res, next) => {
  const {
    sourceStopId,
    destinationStopId,
    routeName,
    distanceKm,
    estimatedDurationMinutes,
    stops
  } = req.body;

  // Verify that source and destination exist
  const [sourceStop, destStop] = await Promise.all([
    Stop.findById(sourceStopId),
    Stop.findById(destinationStopId)
  ]);

  if (!sourceStop || !destStop) {
    return next(new AppError('Source or destination stop does not exist in master catalog.', 404));
  }

  const generatedName = routeName || `${sourceStop.city} to ${destStop.city} (${sourceStop.stopName} → ${destStop.stopName})`;

  // Prepare ordered stops
  let orderedStops = [];
  if (stops && stops.length >= 2) {
    // Sort by stopSequence ascending
    orderedStops = [...stops].sort((a, b) => a.stopSequence - b.stopSequence);

    // Validate that the first stop matches sourceStopId and last stop matches destinationStopId
    if (orderedStops[0].stopId.toString() !== sourceStopId.toString()) {
      return next(new AppError('The first stop in sequence (position 0) must be the source stop.', 400));
    }
    const lastStop = orderedStops[orderedStops.length - 1];
    if (lastStop.stopId.toString() !== destinationStopId.toString()) {
      return next(new AppError('The final stop in sequence must be the destination stop.', 400));
    }
  } else {
    // Default 2-stop route (source: 0, destination: 1)
    orderedStops = [
      { stopId: sourceStopId, stopSequence: 0, distanceFromStart: 0 },
      { stopId: destinationStopId, stopSequence: 1, distanceFromStart: distanceKm || 0 }
    ];
  }

  // Create route document
  const route = await Route.create({
    routeName: generatedName,
    sourceStopId,
    destinationStopId,
    distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
    estimatedDurationMinutes: estimatedDurationMinutes ? parseInt(estimatedDurationMinutes, 10) : undefined,
    isActive: true
  });

  // Bulk create RouteStop records
  const routeStopDocs = orderedStops.map((s) => ({
    routeId: route._id,
    stopId: s.stopId,
    stopSequence: s.stopSequence,
    distanceFromStart: s.distanceFromStart || 0
  }));

  await RouteStop.insertMany(routeStopDocs);

  // Record audit log
  await AuditLog.create({
    userId: req.user._id,
    action: 'ROUTE_CREATED',
    entityType: 'Route',
    entityId: route._id,
    description: `Route '${route.routeName}' created with ${orderedStops.length} stops by admin`,
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  }).catch((err) => console.warn('[Audit Warning] Could not record route creation:', err.message));

  const populatedRouteStops = await RouteStop.find({ routeId: route._id })
    .populate('stopId', 'stopName city state')
    .sort({ stopSequence: 1 });

  res.status(201).json({
    status: 'success',
    message: `Route '${route.routeName}' created successfully with ${orderedStops.length} stops.`,
    data: {
      route,
      routeStops: populatedRouteStops
    }
  });
});

/**
 * Toggle route active status
 * PATCH /api/routes/:routeId/status (Admin only)
 */
const toggleRouteStatus = asyncHandler(async (req, res, next) => {
  const { routeId } = req.params;

  const route = await Route.findById(routeId);
  if (!route) {
    return next(new AppError('Route not found.', 404));
  }

  route.isActive = !route.isActive;
  await route.save();

  res.status(200).json({
    status: 'success',
    message: `Route '${route.routeName}' has been ${route.isActive ? 'activated' : 'deactivated'}.`,
    data: { route }
  });
});

module.exports = {
  getRoutes,
  getRouteById,
  createRoute,
  toggleRouteStatus
};

