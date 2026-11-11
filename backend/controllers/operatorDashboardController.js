const { Bus, Trip, Booking, BookingSeat, SeatInventory } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

/**
 * Get aggregated metrics for Operator Dashboard
 * GET /api/operator/dashboard
 */
const getOperatorDashboard = asyncHandler(async (req, res, next) => {
  if (!req.operator) {
    return next(new AppError('Operator profile required to view operator metrics.', 404));
  }

  const operatorId = req.operator._id;
  const now = new Date();

  // Find all trip IDs belonging to this operator
  const trips = await Trip.find({ operatorId }).select('_id travelDate departureTime baseFare tripStatus');
  const tripIds = trips.map((t) => t._id);

  const [totalBuses, totalTrips, upcomingTrips, bookingsAgg] = await Promise.all([
    Bus.countDocuments({ operatorId }),
    Trip.countDocuments({ operatorId }),
    Trip.countDocuments({
      operatorId,
      departureTime: { $gte: now },
      tripStatus: { $ne: 'cancelled' }
    }),
    Booking.aggregate([
      { $match: { tripId: { $in: tripIds }, bookingStatus: { $in: ['confirmed', 'partially_cancelled'] } } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ])
  ]);

  const bookingStats = bookingsAgg.length > 0 ? bookingsAgg[0] : { totalBookings: 0, totalRevenue: 0 };

  // Calculate seat occupancy percentage across active trips
  let occupancyPercentage = 0;
  if (tripIds.length > 0) {
    const [totalSeatsCount, bookedSeatsCount] = await Promise.all([
      SeatInventory.countDocuments({ tripId: { $in: tripIds }, isActive: true }),
      BookingSeat.countDocuments({
        allocationStatus: 'confirmed'
      })
    ]);
    if (totalSeatsCount > 0) {
      occupancyPercentage = Math.min(100, Math.round((bookedSeatsCount / totalSeatsCount) * 100));
    }
  }

  const recentTrips = await Trip.find({ operatorId })
    .populate('busId', 'busNumber registrationNumber busType totalSeats')
    .populate('routeId', 'routeName')
    .sort({ departureTime: -1 })
    .limit(5);

  res.status(200).json({
    status: 'success',
    data: {
      metrics: {
        totalBuses,
        totalTrips,
        upcomingTrips,
        totalBookings: bookingStats.totalBookings,
        simulatedRevenue: bookingStats.totalRevenue,
        occupancyPercentage
      },
      recentTrips,
      approvalStatus: req.operator.approvalStatus
    }
  });
});

module.exports = { getOperatorDashboard };

