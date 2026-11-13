const {
  User,
  Operator,
  Bus,
  Route,
  Trip,
  TripStop,
  SeatInventory,
  Booking,
  BookingSeat,
  Payment,
  Cancellation,
  CancellationItem,
  Refund
} = require('../models');
const ArchivedSeatInventory = require('../models/ArchivedSeatInventory');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');
const { parseDateRange } = require('../utils/dateFilter');
const { sendCSVResponse } = require('../utils/csvHelper');

// Helper to verify operator ownership
function verifyOperatorOwnership(tripOperatorId, req) {
  if (req.user && req.user.role === 'admin') return true;
  if (!req.operator || !req.operator._id) return false;
  const targetId = tripOperatorId && tripOperatorId._id ? tripOperatorId._id : tripOperatorId;
  return targetId.toString() === req.operator._id.toString();
}

/**
 * ============================================================================
 * 1. ADMIN ANALYTICS & DASHBOARD OVERVIEW
 * GET /api/admin/analytics/overview
 * ============================================================================
 */
const getAdminAnalyticsOverview = asyncHandler(async (req, res, next) => {
  const { filter: dateFilter, start, end, label } = parseDateRange(req.query, 'createdAt');
  const now = new Date();

  // 1. Static Entities Count
  const [
    totalCustomers,
    totalOperators,
    pendingOperators,
    approvedOperators,
    totalBuses,
    totalRoutes,
    totalTrips
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    Operator.countDocuments(),
    Operator.countDocuments({ approvalStatus: 'pending' }),
    Operator.countDocuments({ approvalStatus: 'approved' }),
    Bus.countDocuments(),
    Route.countDocuments(),
    Trip.countDocuments()
  ]);

  // 2. Booking Metrics in Range
  const bookingFilter = { ...dateFilter };
  const [totalBookings, confirmedBookings, cancelledBookings] = await Promise.all([
    Booking.countDocuments(bookingFilter),
    Booking.countDocuments({ ...bookingFilter, bookingStatus: 'confirmed' }),
    Booking.countDocuments({ ...bookingFilter, bookingStatus: { $in: ['cancelled', 'partially_cancelled'] } })
  ]);

  // 3. Financial Metrics (Accurate: Gross successful payments - Completed/Valid Refunds)
  const paymentDateFilter = {};
  if (start || end) {
    paymentDateFilter.createdAt = {};
    if (start) paymentDateFilter.createdAt.$gte = start;
    if (end) paymentDateFilter.createdAt.$lte = end;
  }

  const [paymentAgg, refundAgg] = await Promise.all([
    Payment.aggregate([
      { $match: { ...paymentDateFilter } },
      {
        $group: {
          _id: '$paymentStatus',
          totalAmount: { $sum: '$paymentAmount' },
          count: { $sum: 1 }
        }
      }
    ]),
    Refund.aggregate([
      { $match: { ...paymentDateFilter } },
      {
        $group: {
          _id: '$refundStatus',
          totalAmount: { $sum: '$refundAmount' },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const paymentsMap = paymentAgg.reduce((acc, curr) => {
    acc[curr._id] = curr.totalAmount;
    acc[`${curr._id}_count`] = curr.count;
    return acc;
  }, {});

  const refundsMap = refundAgg.reduce((acc, curr) => {
    acc[curr._id] = curr.totalAmount;
    acc[`${curr._id}_count`] = curr.count;
    return acc;
  }, {});

  const grossBookingRevenue = paymentsMap['successful'] || 0;
  const successfulPaymentCount = paymentsMap['successful_count'] || 0;
  const pendingPaymentsAmount = paymentsMap['pending'] || 0;
  const failedPaymentsAmount = paymentsMap['failed'] || 0;

  // Realized financial calculations: Net settled revenue = Gross successful payments - Completed refunds
  const completedRefundsAmount = refundsMap['completed'] || 0;
  const pendingRefundsAmount = refundsMap['pending'] || 0;
  const processingRefundsAmount = refundsMap['processing'] || 0;
  const failedRefundsAmount = refundsMap['failed'] || 0;

  // Outstanding refund liability (pending + processing, not yet settled)
  const outstandingRefundLiability = pendingRefundsAmount + processingRefundsAmount;

  // Strictly exclude pending/processing/failed refunds from already settled net revenue
  const netRevenue = Math.max(0, grossBookingRevenue - completedRefundsAmount);

  // 4. Booking Trends (Over time in days or months)
  const bookingTrends = await Booking.aggregate([
    { $match: { ...bookingFilter } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalBookings: { $sum: 1 },
        confirmedBookings: {
          $sum: { $cond: [{ $eq: ['$bookingStatus', 'confirmed'] }, 1, 0] }
        },
        cancelledBookings: {
          $sum: { $cond: [{ $in: ['$bookingStatus', ['cancelled', 'partially_cancelled']] }, 1, 0] }
        },
        revenue: {
          $sum: { $cond: [{ $eq: ['$bookingStatus', 'confirmed'] }, '$totalAmount', 0] }
        }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: 30 }
  ]);

  // 5. Booking Status Distribution
  const statusDistributionAgg = await Booking.aggregate([
    { $match: { ...bookingFilter } },
    {
      $group: {
        _id: '$bookingStatus',
        count: { $sum: 1 }
      }
    }
  ]);
  const bookingStatusDistribution = statusDistributionAgg.map((s) => ({
    status: s._id,
    count: s.count
  }));

  // 6. Bus Occupancy Overview (Average occupancy across scheduled trips)
  const tripsWithOccupancy = await Trip.find({ tripStatus: { $ne: 'cancelled' } })
    .populate('busId', 'totalSeats')
    .select('_id busId travelDate');

  let busOccupancyOverview = { averageOccupancyPercentage: 0, totalTripsSampled: tripsWithOccupancy.length };
  if (tripsWithOccupancy.length > 0) {
    const tripIds = tripsWithOccupancy.map((t) => t._id);
    const confirmedSeatsCount = await BookingSeat.countDocuments({
      allocationStatus: 'confirmed'
    });
    const totalCapacity = tripsWithOccupancy.reduce((sum, t) => sum + (t.busId?.totalSeats || 40), 0);
    if (totalCapacity > 0) {
      busOccupancyOverview.averageOccupancyPercentage = Number(
        Math.min(100, (confirmedSeatsCount / totalCapacity) * 100).toFixed(1)
      );
    }
  }

  // 7. Top-performing Operators (by confirmed booking volume and revenue)
  const topOperators = await Booking.aggregate([
    { $match: { bookingStatus: { $in: ['confirmed', 'partially_cancelled'] }, ...bookingFilter } },
    {
      $lookup: {
        from: 'trips',
        localField: 'tripId',
        foreignField: '_id',
        as: 'trip'
      }
    },
    { $unwind: '$trip' },
    {
      $lookup: {
        from: 'operators',
        localField: 'trip.operatorId',
        foreignField: '_id',
        as: 'operator'
      }
    },
    { $unwind: '$operator' },
    {
      $group: {
        _id: '$operator._id',
        companyName: { $first: '$operator.companyName' },
        totalBookings: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { totalRevenue: -1, totalBookings: -1 } },
    { $limit: 5 }
  ]);

  // 8. Most Popular Routes
  const popularRoutes = await Booking.aggregate([
    { $match: { bookingStatus: { $in: ['confirmed', 'partially_cancelled'] }, ...bookingFilter } },
    {
      $lookup: {
        from: 'trips',
        localField: 'tripId',
        foreignField: '_id',
        as: 'trip'
      }
    },
    { $unwind: '$trip' },
    {
      $lookup: {
        from: 'routes',
        localField: 'trip.routeId',
        foreignField: '_id',
        as: 'route'
      }
    },
    { $unwind: '$route' },
    {
      $group: {
        _id: '$route._id',
        routeName: { $first: '$route.routeName' },
        bookingCount: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { bookingCount: -1 } },
    { $limit: 5 }
  ]);

  // 9. Monthly Booking Comparison (Current month vs Previous month)
  const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [currentMonthBookings, prevMonthBookings] = await Promise.all([
    Booking.countDocuments({ createdAt: { $gte: startCurrentMonth } }),
    Booking.countDocuments({ createdAt: { $gte: startPrevMonth, $lte: endPrevMonth } })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      dateRange: { label, start, end },
      summary: {
        totalCustomers,
        totalOperators,
        pendingOperators,
        approvedOperators,
        totalBuses,
        totalRoutes,
        totalTrips,
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        grossBookingRevenue,
        completedRefunds: completedRefundsAmount,
        pendingRefunds: pendingRefundsAmount,
        processingRefunds: processingRefundsAmount,
        failedRefunds: failedRefundsAmount,
        totalRefunds: completedRefundsAmount, // strictly settled completed refunds
        outstandingRefundLiability,
        netRevenue,
        pendingPaymentsAmount,
        failedPaymentsAmount,
        successfulPaymentCount
      },
      charts: {
        bookingTrends,
        bookingStatusDistribution,
        busOccupancyOverview,
        topOperators,
        popularRoutes,
        monthlyComparison: {
          currentMonth: currentMonthBookings,
          previousMonth: prevMonthBookings,
          percentageChange:
            prevMonthBookings > 0
              ? Number((((currentMonthBookings - prevMonthBookings) / prevMonthBookings) * 100).toFixed(1))
              : 0
        }
      }
    }
  });
});

/**
 * ============================================================================
 * 2. ADMIN BOOKINGS ANALYTICS & CSV EXPORT
 * GET /api/admin/analytics/bookings
 * ============================================================================
 */
const getAdminAnalyticsBookings = asyncHandler(async (req, res, next) => {
  const { filter: dateFilter } = parseDateRange(req.query, 'createdAt');
  const format = req.query.format;
  const search = req.query.search;
  const status = req.query.status;

  const match = { ...dateFilter };
  if (status && status !== 'all') {
    match.bookingStatus = status;
  }
  if (search) {
    match.$or = [{ pnr: new RegExp(search, 'i') }];
  }

  const bookings = await Booking.find(match)
    .populate('userId', 'name email phone')
    .populate({
      path: 'tripId',
      populate: [
        { path: 'busId', select: 'busNumber busType' },
        { path: 'routeId', select: 'routeName' },
        { path: 'operatorId', select: 'companyName' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(format === 'csv' ? 5000 : 100);

  if (format === 'csv') {
    const columns = [
      { key: 'pnr', label: 'PNR' },
      { key: 'customerName', label: 'Customer Name', format: (r) => r.userId?.name || 'N/A' },
      { key: 'customerPhone', label: 'Customer Phone', format: (r) => r.userId?.phone || 'N/A' },
      { key: 'operator', label: 'Operator', format: (r) => r.tripId?.operatorId?.companyName || 'N/A' },
      { key: 'route', label: 'Route', format: (r) => r.tripId?.routeId?.routeName || 'N/A' },
      { key: 'busNumber', label: 'Bus Number', format: (r) => r.tripId?.busId?.busNumber || 'N/A' },
      { key: 'bookingStatus', label: 'Status' },
      { key: 'totalAmount', label: 'Total Amount (INR)' },
      { key: 'createdAt', label: 'Booking Date', format: (r) => new Date(r.createdAt).toISOString() }
    ];
    return sendCSVResponse(res, `admin-bookings-report-${Date.now()}.csv`, columns, bookings);
  }

  res.status(200).json({
    status: 'success',
    data: {
      total: bookings.length,
      bookings
    }
  });
});

/**
 * ============================================================================
 * 3. ADMIN REVENUE ANALYTICS & CSV EXPORT
 * GET /api/admin/analytics/revenue
 * ============================================================================
 */
const getAdminAnalyticsRevenue = asyncHandler(async (req, res, next) => {
  const { filter: dateFilter, start, end } = parseDateRange(req.query, 'createdAt');
  const format = req.query.format;

  const [payments, allRefunds] = await Promise.all([
    Payment.find({ paymentStatus: 'successful', ...dateFilter })
      .populate('bookingId', 'pnr')
      .sort({ createdAt: -1 }),
    Refund.find(dateFilter)
      .populate({
        path: 'cancellationId',
        populate: { path: 'bookingId', select: 'pnr' }
      })
      .sort({ createdAt: -1 })
  ]);

  const grossRevenue = payments.reduce((sum, p) => sum + (p.paymentAmount || 0), 0);

  const completedRefundsList = allRefunds.filter((r) => r.refundStatus === 'completed');
  const pendingRefundsList = allRefunds.filter((r) => r.refundStatus === 'pending');
  const processingRefundsList = allRefunds.filter((r) => r.refundStatus === 'processing');
  const failedRefundsList = allRefunds.filter((r) => r.refundStatus === 'failed');

  const completedRefunds = completedRefundsList.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const pendingRefunds = pendingRefundsList.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const processingRefunds = processingRefundsList.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const failedRefunds = failedRefundsList.reduce((sum, r) => sum + (r.refundAmount || 0), 0);

  const outstandingRefundLiability = pendingRefunds + processingRefunds;
  const netRevenue = Math.max(0, grossRevenue - completedRefunds);

  // Group by payment method
  const methodMap = {};
  payments.forEach((p) => {
    const method = p.paymentMethod || 'other';
    methodMap[method] = (methodMap[method] || 0) + p.paymentAmount;
  });

  if (format === 'csv') {
    const columns = [
      { key: 'type', label: 'Transaction Type' },
      { key: 'reference', label: 'Reference ID', format: (r) => r.paymentReference || r.refundReference || '—' },
      { key: 'pnr', label: 'PNR', format: (r) => r.bookingId?.pnr || r.cancellationId?.bookingId?.pnr || '—' },
      { key: 'method', label: 'Method / Channel', format: (r) => r.paymentMethod || r.provider || 'simulated' },
      { key: 'amount', label: 'Amount (INR)', format: (r) => r.paymentAmount || -r.refundAmount },
      { key: 'status', label: 'Status', format: (r) => r.paymentStatus || r.refundStatus },
      { key: 'date', label: 'Transaction Date', format: (r) => new Date(r.createdAt).toISOString() }
    ];

    const records = [
      ...payments.map((p) => ({ ...(typeof p.toObject === 'function' ? p.toObject() : p), type: 'PAYMENT' })),
      ...allRefunds.map((r) => ({ ...(typeof r.toObject === 'function' ? r.toObject() : r), type: 'REFUND' }))
    ];

    return sendCSVResponse(res, `admin-revenue-report-${Date.now()}.csv`, columns, records);
  }

  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        grossRevenue,
        completedRefunds,
        pendingRefunds,
        processingRefunds,
        failedRefunds,
        totalRefunds: completedRefunds,
        outstandingRefundLiability,
        netRevenue,
        paymentCount: payments.length,
        refundCount: completedRefundsList.length
      },
      paymentMethods: Object.entries(methodMap).map(([method, amount]) => ({ method, amount })),
      recentPayments: payments.slice(0, 20),
      recentRefunds: completedRefundsList.slice(0, 20)
    }
  });
});

/**
 * ============================================================================
 * 4. ADMIN OPERATORS ANALYTICS
 * GET /api/admin/analytics/operators
 * ============================================================================
 */
const getAdminAnalyticsOperators = asyncHandler(async (req, res, next) => {
  const operators = await Operator.find()
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 });

  const operatorMetrics = await Promise.all(
    operators.map(async (op) => {
      const [totalBuses, trips] = await Promise.all([
        Bus.countDocuments({ operatorId: op._id }),
        Trip.find({ operatorId: op._id }).select('_id')
      ]);

      const tripIds = trips.map((t) => t._id);
      let bookingCount = 0;
      let revenue = 0;

      if (tripIds.length > 0) {
        const bookingAgg = await Booking.aggregate([
          { $match: { tripId: { $in: tripIds }, bookingStatus: { $in: ['confirmed', 'partially_cancelled'] } } },
          {
            $group: {
              _id: null,
              totalBookings: { $sum: 1 },
              totalRevenue: { $sum: '$totalAmount' }
            }
          }
        ]);
        if (bookingAgg.length > 0) {
          bookingCount = bookingAgg[0].totalBookings;
          revenue = bookingAgg[0].totalRevenue;
        }
      }

      return {
        operatorId: op._id,
        companyName: op.companyName,
        contactName: op.userId?.name || 'N/A',
        contactEmail: op.userId?.email || 'N/A',
        approvalStatus: op.approvalStatus,
        totalBuses,
        totalTrips: tripIds.length,
        totalBookings: bookingCount,
        revenue
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: {
      totalOperators: operators.length,
      operators: operatorMetrics
    }
  });
});

/**
 * ============================================================================
 * 5. OPERATOR ANALYTICS OVERVIEW
 * GET /api/operator/analytics/overview
 * ============================================================================
 */
const getOperatorAnalyticsOverview = asyncHandler(async (req, res, next) => {
  if (!req.operator) {
    return next(new AppError('Operator profile required to view metrics.', 404));
  }

  const operatorId = req.operator._id;
  const { filter: dateFilter, start, end, label } = parseDateRange(req.query, 'createdAt');
  const now = new Date();

  // 1. Operator Fleet & Trips Counts
  const [totalBuses, activeBuses, upcomingTrips, completedTrips, cancelledTrips, allTrips] = await Promise.all([
    Bus.countDocuments({ operatorId }),
    Bus.countDocuments({ operatorId, isActive: true }),
    Trip.countDocuments({
      operatorId,
      departureTime: { $gte: now },
      tripStatus: { $ne: 'cancelled' }
    }),
    Trip.countDocuments({
      operatorId,
      departureTime: { $lt: now }
    }),
    Trip.countDocuments({
      operatorId,
      tripStatus: 'cancelled'
    }),
    Trip.find({ operatorId })
      .populate('busId', 'busNumber totalSeats')
      .populate('routeId', 'routeName')
      .select('_id busId routeId travelDate departureTime baseFare tripStatus')
  ]);

  const tripIds = allTrips.map((t) => t._id);
  const totalRoutesServed = new Set(allTrips.map((t) => t.routeId?._id?.toString()).filter(Boolean)).size;

  // 2. Booking and Revenue Metrics for this Operator
  let totalBookings = 0;
  let confirmedPassengers = 0;
  let operatorGrossRevenue = 0;
  let operatorRefunds = 0;
  let bookingTrends = [];
  let popularRoutes = [];
  let recentBookings = [];
  let recentCancellations = [];
  let recentRefunds = [];
  let averageOccupancyPercentage = 0;

  if (tripIds.length > 0) {
    const bookingMatch = {
      tripId: { $in: tripIds },
      ...dateFilter
    };

    const [bookingsAgg, seatsAgg] = await Promise.all([
      Booking.aggregate([
        { $match: bookingMatch },
        {
          $group: {
            _id: '$bookingStatus',
            count: { $sum: 1 },
            amount: { $sum: '$totalAmount' }
          }
        }
      ]),
      BookingSeat.countDocuments({
        allocationStatus: 'confirmed'
      })
    ]);

    const bookingStatusMap = bookingsAgg.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      if (curr._id === 'confirmed' || curr._id === 'partially_cancelled') {
        operatorGrossRevenue += curr.amount;
      }
      return acc;
    }, {});

    totalBookings = bookingsAgg.reduce((sum, b) => sum + b.count, 0);
    confirmedPassengers = seatsAgg;

    // Cancellations & Refunds tied to operator bookings
    const operatorBookings = await Booking.find({ tripId: { $in: tripIds } }).select('_id');
    const operatorBookingIds = operatorBookings.map((b) => b._id);

    const [cancellationsList, refundsList] = await Promise.all([
      Cancellation.find({ bookingId: { $in: operatorBookingIds } })
        .populate('bookingId', 'pnr')
        .sort({ createdAt: -1 })
        .limit(5),
      Refund.find({ refundStatus: { $ne: 'failed' } })
        .populate({
          path: 'cancellationId',
          match: { bookingId: { $in: operatorBookingIds } },
          populate: { path: 'bookingId', select: 'pnr' }
        })
        .sort({ createdAt: -1 })
    ]);

    // Filter refunds matching this operator's cancellations
    const matchedRefunds = refundsList.filter((r) => r.cancellationId);
    const completedRefunds = matchedRefunds
      .filter((r) => r.refundStatus === 'completed')
      .reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const pendingRefunds = matchedRefunds
      .filter((r) => r.refundStatus === 'pending')
      .reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const processingRefunds = matchedRefunds
      .filter((r) => r.refundStatus === 'processing')
      .reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const failedRefunds = matchedRefunds
      .filter((r) => r.refundStatus === 'failed')
      .reduce((sum, r) => sum + (r.refundAmount || 0), 0);

    const outstandingRefundLiability = pendingRefunds + processingRefunds;
    operatorRefunds = completedRefunds; // strictly completed settlements
    recentRefunds = matchedRefunds.slice(0, 5);
    recentCancellations = cancellationsList;

    // Booking Trends for Operator
    bookingTrends = await Booking.aggregate([
      { $match: { tripId: { $in: tripIds }, ...dateFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          bookings: { $sum: 1 },
          revenue: {
            $sum: { $cond: [{ $in: ['$bookingStatus', ['confirmed', 'partially_cancelled']] }, '$totalAmount', 0] }
          }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    // Popular Routes for Operator
    popularRoutes = await Booking.aggregate([
      { $match: { tripId: { $in: tripIds }, bookingStatus: { $in: ['confirmed', 'partially_cancelled'] }, ...dateFilter } },
      {
        $lookup: {
          from: 'trips',
          localField: 'tripId',
          foreignField: '_id',
          as: 'trip'
        }
      },
      { $unwind: '$trip' },
      {
        $lookup: {
          from: 'routes',
          localField: 'trip.routeId',
          foreignField: '_id',
          as: 'route'
        }
      },
      { $unwind: '$route' },
      {
        $group: {
          _id: '$route._id',
          routeName: { $first: '$route.routeName' },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: 5 }
    ]);

    // Recent Bookings
    recentBookings = await Booking.find({ tripId: { $in: tripIds } })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate Average Occupancy across Operator's Trips
    const totalCapacity = allTrips.reduce((sum, t) => sum + (t.busId?.totalSeats || 40), 0);
    if (totalCapacity > 0) {
      averageOccupancyPercentage = Number(
        Math.min(100, (confirmedPassengers / totalCapacity) * 100).toFixed(1)
      );
    }
  }

  const upcomingTripsList = await Trip.find({
    operatorId,
    departureTime: { $gte: now },
    tripStatus: { $ne: 'cancelled' }
  })
    .populate('busId', 'busNumber busType totalSeats')
    .populate('routeId', 'routeName')
    .sort({ departureTime: 1 })
    .limit(5);

  const netRevenue = Math.max(0, operatorGrossRevenue - operatorRefunds);

  res.status(200).json({
    status: 'success',
    data: {
      dateRange: { label, start, end },
      metrics: {
        totalBuses,
        activeBuses,
        totalRoutesServed,
        upcomingTrips,
        completedTrips,
        cancelledTrips,
        totalBookings,
        confirmedPassengers,
        grossRevenue: operatorGrossRevenue,
        totalRefunds: operatorRefunds,
        netRevenue,
        averageOccupancyPercentage
      },
      charts: {
        bookingTrends,
        popularRoutes
      },
      recentActivity: {
        recentBookings,
        upcomingTrips: upcomingTripsList,
        recentCancellations,
        recentRefunds
      }
    }
  });
});

/**
 * ============================================================================
 * 6. OPERATOR BOOKINGS & REVENUE ANALYTICS
 * GET /api/operator/analytics/bookings
 * GET /api/operator/analytics/revenue
 * ============================================================================
 */
const getOperatorAnalyticsBookings = asyncHandler(async (req, res, next) => {
  if (!req.operator) {
    return next(new AppError('Operator profile required to view bookings.', 404));
  }

  const operatorId = req.operator._id;
  const { filter: dateFilter } = parseDateRange(req.query, 'createdAt');
  const format = req.query.format;
  const search = req.query.search;
  const status = req.query.status;

  const trips = await Trip.find({ operatorId }).select('_id');
  const tripIds = trips.map((t) => t._id);

  const match = {
    tripId: { $in: tripIds },
    ...dateFilter
  };

  if (status && status !== 'all') {
    match.bookingStatus = status;
  }
  if (search) {
    match.$or = [{ pnr: new RegExp(search, 'i') }];
  }

  const bookings = await Booking.find(match)
    .populate('userId', 'name email phone')
    .populate({
      path: 'tripId',
      populate: [
        { path: 'busId', select: 'busNumber busType' },
        { path: 'routeId', select: 'routeName' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(format === 'csv' ? 5000 : 100);

  if (format === 'csv') {
    const columns = [
      { key: 'pnr', label: 'PNR' },
      { key: 'customerName', label: 'Passenger Name', format: (r) => r.userId?.name || 'N/A' },
      { key: 'customerPhone', label: 'Contact Phone', format: (r) => r.userId?.phone || 'N/A' },
      { key: 'route', label: 'Route', format: (r) => r.tripId?.routeId?.routeName || 'N/A' },
      { key: 'busNumber', label: 'Bus Number', format: (r) => r.tripId?.busId?.busNumber || 'N/A' },
      { key: 'bookingStatus', label: 'Status' },
      { key: 'totalAmount', label: 'Fare (INR)' },
      { key: 'createdAt', label: 'Booking Date', format: (r) => new Date(r.createdAt).toISOString() }
    ];
    return sendCSVResponse(res, `operator-bookings-${Date.now()}.csv`, columns, bookings);
  }

  res.status(200).json({
    status: 'success',
    data: {
      total: bookings.length,
      bookings
    }
  });
});

const getOperatorAnalyticsRevenue = asyncHandler(async (req, res, next) => {
  if (!req.operator) {
    return next(new AppError('Operator profile required to view revenue.', 404));
  }

  const operatorId = req.operator._id;
  const { filter: dateFilter } = parseDateRange(req.query, 'createdAt');
  const format = req.query.format;

  const trips = await Trip.find({ operatorId }).select('_id');
  const tripIds = trips.map((t) => t._id);

  const bookings = await Booking.find({ tripId: { $in: tripIds } }).select('_id pnr');
  const bookingIds = bookings.map((b) => b._id);

  const [payments, refunds] = await Promise.all([
    Payment.find({
      bookingId: { $in: bookingIds },
      paymentStatus: 'successful',
      ...dateFilter
    })
      .populate('bookingId', 'pnr')
      .sort({ createdAt: -1 }),
    Refund.find({
      refundStatus: { $ne: 'failed' },
      ...dateFilter
    })
      .populate({
        path: 'cancellationId',
        match: { bookingId: { $in: bookingIds } },
        populate: { path: 'bookingId', select: 'pnr' }
      })
      .sort({ createdAt: -1 })
  ]);

  const matchedRefunds = refunds.filter((r) => r.cancellationId);
  const completedRefundsList = matchedRefunds.filter((r) => r.refundStatus === 'completed');
  const pendingRefundsList = matchedRefunds.filter((r) => r.refundStatus === 'pending');
  const processingRefundsList = matchedRefunds.filter((r) => r.refundStatus === 'processing');
  const failedRefundsList = matchedRefunds.filter((r) => r.refundStatus === 'failed');

  const grossRevenue = payments.reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
  const completedRefunds = completedRefundsList.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const pendingRefunds = pendingRefundsList.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const processingRefunds = processingRefundsList.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const failedRefunds = failedRefundsList.reduce((sum, r) => sum + (r.refundAmount || 0), 0);

  const outstandingRefundLiability = pendingRefunds + processingRefunds;
  const netRevenue = Math.max(0, grossRevenue - completedRefunds);

  if (format === 'csv') {
    const columns = [
      { key: 'type', label: 'Transaction Type' },
      { key: 'reference', label: 'Reference' },
      { key: 'pnr', label: 'PNR', format: (r) => r.bookingId?.pnr || r.cancellationId?.bookingId?.pnr || '—' },
      { key: 'amount', label: 'Amount (INR)', format: (r) => r.paymentAmount || -r.refundAmount },
      { key: 'status', label: 'Status', format: (r) => r.paymentStatus || r.refundStatus },
      { key: 'date', label: 'Date', format: (r) => new Date(r.createdAt).toISOString() }
    ];
    const records = [
      ...payments.map((p) => ({
        ...(typeof p.toObject === 'function' ? p.toObject() : p),
        type: 'PAYMENT',
        reference: p.paymentReference
      })),
      ...matchedRefunds.map((r) => ({
        ...(typeof r.toObject === 'function' ? r.toObject() : r),
        type: 'REFUND',
        reference: r.refundReference
      }))
    ];
    return sendCSVResponse(res, `operator-revenue-${Date.now()}.csv`, columns, records);
  }

  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        grossRevenue,
        completedRefunds,
        pendingRefunds,
        processingRefunds,
        failedRefunds,
        totalRefunds: completedRefunds,
        outstandingRefundLiability,
        netRevenue,
        paymentCount: payments.length,
        refundCount: completedRefundsList.length
      },
      payments: payments.slice(0, 50),
      refunds: completedRefundsList.slice(0, 50)
    }
  });
});

/**
 * ============================================================================
 * 7. TRIP OCCUPANCY REPORT & CSV EXPORT
 * GET /api/reports/occupancy
 * GET /api/admin/reports/occupancy
 * GET /api/operator/reports/occupancy
 * ============================================================================
 */
const getTripOccupancyReport = asyncHandler(async (req, res, next) => {
  const { filter: dateFilter } = parseDateRange(req.query, 'departureTime');
  const format = req.query.format;
  const search = req.query.search;
  const routeId = req.query.routeId;
  const tripId = req.query.tripId;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const match = { ...dateFilter };

  // Operator Isolation: If logged in as operator, scope strictly to operator's trips
  if (req.user.role === 'operator') {
    if (!req.operator) {
      return next(new AppError('Operator profile required to view occupancy.', 404));
    }
    match.operatorId = req.operator._id;
  } else if (req.query.operatorId) {
    // Admin filtering by operator
    match.operatorId = req.query.operatorId;
  }

  if (routeId) match.routeId = routeId;
  if (tripId) match._id = tripId;

  const query = Trip.find(match)
    .populate('busId', 'busNumber registrationNumber busType totalSeats')
    .populate('operatorId', 'companyName')
    .populate('routeId', 'routeName origin destination')
    .sort({ departureTime: -1 });

  let trips = [];
  let totalTrips = 0;

  if (format === 'csv') {
    trips = await query.limit(2000);
  } else {
    totalTrips = await Trip.countDocuments(match);
    trips = await query.skip(skip).limit(limit);
  }

  const now = new Date();

  // Compute segment-aware detailed occupancy for each trip
  const occupancyRows = await Promise.all(
    trips.map(async (trip) => {
      const totalSeats = trip.busId?.totalSeats || 40;

      // Find booking seats for this trip
      const bookings = await Booking.find({ tripId: trip._id }).select('_id');
      const bookingIds = bookings.map((b) => b._id);

      // Fetch TripStops, BookingSeats, and SeatInventory records
      const [tripStops, confirmedBookingSeats, cancelledSeatsCount, seatInventories] = await Promise.all([
        TripStop.find({ tripId: trip._id })
          .sort({ stopSequence: 1 })
          .populate('stopId', 'stopName city'),
        BookingSeat.find({
          bookingId: { $in: bookingIds },
          allocationStatus: 'confirmed'
        }),
        BookingSeat.countDocuments({
          bookingId: { $in: bookingIds },
          allocationStatus: 'cancelled'
        }),
        SeatInventory.find({ tripId: trip._id, isActive: true })
      ]);

      // If active seat inventory has been archived for a historical/completed trip, fallback to ArchivedSeatInventory
      let effectiveSeatInventories = seatInventories;
      if ((!effectiveSeatInventories || effectiveSeatInventories.length === 0) && trip.tripStatus === 'completed') {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1 || ArchivedSeatInventory.find !== mongoose.Model.find) {
          try {
            effectiveSeatInventories = await ArchivedSeatInventory.find({ tripId: trip._id });
          } catch (e) {
            effectiveSeatInventories = [];
          }
        }
      }

      // Collect active held segments
      const activeHolds = [];
      for (const si of effectiveSeatInventories) {
        for (const seg of si.activeSegments || []) {
          if (seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) > now) {
            activeHolds.push({
              seatNumber: si.seatNumber,
              fromSequence: seg.fromSequence,
              toSequence: seg.toSequence
            });
          }
        }
      }

      // Build atomic segments
      const segments = [];
      if (tripStops && tripStops.length >= 2) {
        for (let i = 0; i < tripStops.length - 1; i++) {
          const s_from = tripStops[i].stopSequence;
          const s_to = tripStops[i + 1].stopSequence;
          const fromStopName = tripStops[i].stopId?.stopName || `Stop #${s_from}`;
          const toStopName = tripStops[i + 1].stopId?.stopName || `Stop #${s_to}`;

          // Distinct physical seats confirmed on this segment [s_from, s_to)
          const confirmedOnSeg = new Set();
          for (const bs of confirmedBookingSeats) {
            if (bs.fromSequence < s_to && bs.toSequence > s_from) {
              confirmedOnSeg.add(bs.seatNumber);
            }
          }

          // Distinct physical seats held on this segment [s_from, s_to)
          const heldOnSeg = new Set();
          for (const h of activeHolds) {
            if (h.fromSequence < s_to && h.toSequence > s_from && !confirmedOnSeg.has(h.seatNumber)) {
              heldOnSeg.add(h.seatNumber);
            }
          }

          const confirmedCount = confirmedOnSeg.size;
          const heldCount = heldOnSeg.size;
          const availCount = Math.max(0, totalSeats - confirmedCount - heldCount);
          const segOccPct = totalSeats > 0 ? Number(((confirmedCount / totalSeats) * 100).toFixed(1)) : 0;

          segments.push({
            segmentIndex: i + 1,
            fromSequence: s_from,
            toSequence: s_to,
            fromStop: fromStopName,
            toStop: toStopName,
            totalSeats,
            confirmedSeats: confirmedCount,
            heldSeats: heldCount,
            availableSeats: availCount,
            occupancyPercentage: segOccPct
          });
        }
      } else {
        // Fallback for direct trips without intermediate tripStops
        let s_from = 1;
        let s_to = 2;
        if (confirmedBookingSeats.length > 0) {
          s_from = Math.min(...confirmedBookingSeats.map((b) => b.fromSequence));
          s_to = Math.max(...confirmedBookingSeats.map((b) => b.toSequence));
          if (s_from === s_to) s_to = s_from + 1;
        }

        const confirmedOnSeg = new Set();
        for (const bs of confirmedBookingSeats) {
          if (bs.fromSequence < s_to && bs.toSequence > s_from) {
            confirmedOnSeg.add(bs.seatNumber);
          }
        }
        const heldOnSeg = new Set();
        for (const h of activeHolds) {
          if (h.fromSequence < s_to && h.toSequence > s_from && !confirmedOnSeg.has(h.seatNumber)) {
            heldOnSeg.add(h.seatNumber);
          }
        }

        const confirmedCount = confirmedOnSeg.size;
        const heldCount = heldOnSeg.size;
        const availCount = Math.max(0, totalSeats - confirmedCount - heldCount);
        const segOccPct = totalSeats > 0 ? Number(((confirmedCount / totalSeats) * 100).toFixed(1)) : 0;

        segments.push({
          segmentIndex: 1,
          fromSequence: s_from,
          toSequence: s_to,
          fromStop: trip.routeId?.origin || 'Origin',
          toStop: trip.routeId?.destination || 'Destination',
          totalSeats,
          confirmedSeats: confirmedCount,
          heldSeats: heldCount,
          availableSeats: availCount,
          occupancyPercentage: segOccPct
        });
      }

      // Calculate Trip-Level Aggregate Metrics
      const peakSimultaneousOccupied = segments.length > 0
        ? Math.max(...segments.map((s) => s.confirmedSeats))
        : 0;
      const peakHeld = segments.length > 0
        ? Math.max(...segments.map((s) => s.heldSeats))
        : 0;
      const minAvailableSeats = Math.max(0, totalSeats - peakSimultaneousOccupied - peakHeld);
      const averageOccupancyPercentage = segments.length > 0
        ? Number((segments.reduce((sum, s) => sum + s.occupancyPercentage, 0) / segments.length).toFixed(1))
        : 0;
      const peakOccupancyPercentage = totalSeats > 0
        ? Number(((peakSimultaneousOccupied / totalSeats) * 100).toFixed(1))
        : 0;

      return {
        tripId: trip._id,
        busNumber: trip.busId?.busNumber || 'N/A',
        busType: trip.busId?.busType || 'N/A',
        operatorName: trip.operatorId?.companyName || 'N/A',
        routeName: trip.routeId?.routeName || 'N/A',
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        tripStatus: trip.tripStatus,
        totalSeats,
        totalPhysicalSeats: totalSeats,
        confirmedSeats: peakSimultaneousOccupied,
        heldSeats: peakHeld,
        availableSeats: minAvailableSeats,
        cancelledSeats: cancelledSeatsCount,
        occupancyPercentage: averageOccupancyPercentage,
        peakOccupancyPercentage,
        totalAllocations: confirmedBookingSeats.length,
        segmentCount: segments.length,
        segments
      };
    })
  );

  // Apply in-memory search if requested
  let filteredRows = occupancyRows;
  if (search) {
    const s = search.toLowerCase();
    filteredRows = occupancyRows.filter(
      (r) =>
        r.busNumber.toLowerCase().includes(s) ||
        r.routeName.toLowerCase().includes(s) ||
        r.operatorName.toLowerCase().includes(s)
    );
  }

  if (format === 'csv') {
    const columns = [
      { key: 'tripId', label: 'Trip ID' },
      { key: 'busNumber', label: 'Bus Number' },
      { key: 'operatorName', label: 'Operator' },
      { key: 'routeName', label: 'Route' },
      { key: 'departureTime', label: 'Departure', format: (r) => new Date(r.departureTime).toISOString() },
      { key: 'arrivalTime', label: 'Arrival', format: (r) => new Date(r.arrivalTime).toISOString() },
      { key: 'tripStatus', label: 'Status' },
      { key: 'totalSeats', label: 'Total Physical Seats' },
      { key: 'confirmedSeats', label: 'Peak Occupied Seats' },
      { key: 'heldSeats', label: 'Held Seats' },
      { key: 'availableSeats', label: 'Min Available Seats' },
      { key: 'totalAllocations', label: 'Total Allocations' },
      { key: 'cancelledSeats', label: 'Cancelled Seats' },
      { key: 'occupancyPercentage', label: 'Avg Segment Occupancy %', format: (r) => `${r.occupancyPercentage}%` },
      { key: 'peakOccupancyPercentage', label: 'Peak Occupancy %', format: (r) => `${r.peakOccupancyPercentage}%` }
    ];
    return sendCSVResponse(res, `occupancy-report-${Date.now()}.csv`, columns, filteredRows);
  }

  res.status(200).json({
    status: 'success',
    data: {
      pagination: {
        page,
        limit,
        totalTrips,
        totalPages: Math.ceil(totalTrips / limit)
      },
      occupancy: filteredRows
    }
  });
});

/**
 * ============================================================================
 * 8. PASSENGER MANIFEST REPORT & CSV EXPORT
 * GET /api/reports/trips/:tripId/manifest
 * GET /api/operator/reports/trips/:tripId/manifest
 * GET /api/admin/reports/trips/:tripId/manifest
 * ============================================================================
 */
const getPassengerManifestReport = asyncHandler(async (req, res, next) => {
  const { tripId } = req.params;
  const format = req.query.format;
  const search = req.query.search;
  const statusFilter = req.query.status || 'all'; // 'confirmed', 'cancelled', 'all'
  const seatFilter = req.query.seat;

  const trip = await Trip.findById(tripId)
    .populate('busId', 'busNumber registrationNumber busType totalSeats')
    .populate('operatorId', 'companyName')
    .populate('routeId', 'routeName');

  if (!trip) {
    return next(new AppError('Trip not found.', 404));
  }

  // Enforce Operator Ownership Isolation
  if (!verifyOperatorOwnership(trip.operatorId, req)) {
    return next(new AppError('Forbidden. You do not have permission to view this passenger manifest.', 403));
  }

  // Find all bookings for this trip
  const bookings = await Booking.find({ tripId: trip._id }).select('_id pnr userId bookingStatus totalAmount');
  const bookingIds = bookings.map((b) => b._id);

  // Status condition for booking seats
  const seatQuery = { bookingId: { $in: bookingIds } };
  if (statusFilter === 'confirmed') {
    seatQuery.allocationStatus = 'confirmed';
  } else if (statusFilter === 'cancelled') {
    seatQuery.allocationStatus = 'cancelled';
  } else {
    seatQuery.allocationStatus = { $in: ['confirmed', 'cancelled'] };
  }

  if (seatFilter) {
    seatQuery.seatNumber = seatFilter;
  }

  const bookingSeats = await BookingSeat.find(seatQuery)
    .populate('passengerId', 'fullName age gender phone email')
    .populate('boardingStopId', 'stopName city')
    .populate('droppingStopId', 'stopName city')
    .sort({ seatNumber: 1 });

  let passengers = bookingSeats.map((bs) => {
    const parentBooking = bookings.find((b) => b._id.toString() === bs.bookingId.toString());
    return {
      bookingSeatId: bs._id,
      pnr: parentBooking ? parentBooking.pnr : '—',
      seatNumber: bs.seatNumber,
      passengerName: bs.passengerId?.fullName || 'N/A',
      age: bs.passengerId?.age || '—',
      gender: bs.passengerId?.gender || '—',
      phone: bs.passengerId?.phone || '—',
      email: bs.passengerId?.email || '—',
      boardingStop: bs.boardingStopId?.stopName || `Stop #${bs.fromSequence}`,
      droppingStop: bs.droppingStopId?.stopName || `Stop #${bs.toSequence}`,
      fare: bs.segmentFare,
      status: bs.allocationStatus
    };
  });

  // Search filter by passenger name or PNR
  if (search) {
    const s = search.toLowerCase();
    passengers = passengers.filter(
      (p) => p.passengerName.toLowerCase().includes(s) || p.pnr.toLowerCase().includes(s)
    );
  }

  const confirmedCount = passengers.filter((p) => p.status === 'confirmed').length;
  const cancelledCount = passengers.filter((p) => p.status === 'cancelled').length;

  if (format === 'csv') {
    const columns = [
      { key: 'seatNumber', label: 'Seat' },
      { key: 'pnr', label: 'PNR' },
      { key: 'passengerName', label: 'Passenger Name' },
      { key: 'age', label: 'Age' },
      { key: 'gender', label: 'Gender' },
      { key: 'boardingStop', label: 'Boarding Point' },
      { key: 'droppingStop', label: 'Dropping Point' },
      { key: 'phone', label: 'Contact Phone' },
      { key: 'email', label: 'Contact Email' },
      { key: 'status', label: 'Booking Status' },
      { key: 'fare', label: 'Fare (INR)' }
    ];
    return sendCSVResponse(res, `manifest-trip-${trip._id}-${Date.now()}.csv`, columns, passengers);
  }

  res.status(200).json({
    status: 'success',
    data: {
      trip: {
        _id: trip._id,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        tripStatus: trip.tripStatus,
        bus: trip.busId,
        route: trip.routeId,
        operator: trip.operatorId
      },
      summary: {
        totalSeats: trip.busId?.totalSeats || 40,
        confirmedCount,
        cancelledCount,
        totalManifestRecords: passengers.length
      },
      passengers
    }
  });
});

/**
 * ============================================================================
 * 9. CANCELLATION AND REFUND REPORTS & CSV EXPORT
 * GET /api/admin/reports/cancellations
 * GET /api/admin/reports/refunds
 * GET /api/reports/cancellations-refunds
 * ============================================================================
 */
const getCancellationRefundReport = asyncHandler(async (req, res, next) => {
  const { filter: dateFilter } = parseDateRange(req.query, 'createdAt');
  const format = req.query.format;
  const search = req.query.search;
  const statusFilter = req.query.refundStatus;

  // 1. Fetch Cancellations
  const cancellations = await Cancellation.find(dateFilter)
    .populate('bookingId', 'pnr totalAmount bookingStatus')
    .populate('requestedBy', 'name email')
    .sort({ createdAt: -1 });

  // 2. Fetch Refunds
  const refundMatch = { ...dateFilter };
  if (statusFilter && statusFilter !== 'all') {
    refundMatch.refundStatus = statusFilter;
  }

  const refunds = await Refund.find(refundMatch)
    .populate({
      path: 'cancellationId',
      populate: [
        { path: 'bookingId', select: 'pnr totalAmount' },
        { path: 'requestedBy', select: 'name email' }
      ]
    })
    .sort({ createdAt: -1 });

  // Compute Metrics without double counting
  const totalCancellations = cancellations.length;
  const fullyCancelledCount = cancellations.filter(
    (c) => c.bookingId?.bookingStatus === 'cancelled'
  ).length;
  const partiallyCancelledCount = cancellations.filter(
    (c) => c.bookingId?.bookingStatus === 'partially_cancelled'
  ).length;

  const totalCancellationCharges = cancellations.reduce(
    (sum, c) => sum + (c.totalCancellationCharge || 0),
    0
  );
  const totalRefundAmount = refunds.reduce((sum, r) => sum + (r.refundAmount || 0), 0);

  const pendingRefunds = refunds.filter((r) => r.refundStatus === 'pending');
  const processingRefunds = refunds.filter((r) => r.refundStatus === 'processing');
  const completedRefunds = refunds.filter((r) => r.refundStatus === 'completed');
  const failedRefunds = refunds.filter((r) => r.refundStatus === 'failed');

  let rows = refunds.map((r) => ({
    refundId: r._id,
    refundReference: r.refundReference || '—',
    pnr: r.cancellationId?.bookingId?.pnr || '—',
    customerName: r.cancellationId?.requestedBy?.name || 'N/A',
    customerEmail: r.cancellationId?.requestedBy?.email || 'N/A',
    bookingTotal: r.cancellationId?.bookingId?.totalAmount || 0,
    refundAmount: r.refundAmount,
    cancellationCharge: r.cancellationId?.totalCancellationCharge || 0,
    refundStatus: r.refundStatus,
    provider: r.provider,
    processedAt: r.processedAt,
    createdAt: r.createdAt
  }));

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.pnr.toLowerCase().includes(s) ||
        r.refundReference.toLowerCase().includes(s) ||
        r.customerName.toLowerCase().includes(s) ||
        r.customerEmail.toLowerCase().includes(s)
    );
  }

  if (format === 'csv') {
    const columns = [
      { key: 'refundReference', label: 'Refund Reference' },
      { key: 'pnr', label: 'PNR' },
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerEmail', label: 'Email' },
      { key: 'refundAmount', label: 'Refund Amount (INR)' },
      { key: 'cancellationCharge', label: 'Cancellation Fee (INR)' },
      { key: 'refundStatus', label: 'Refund Status' },
      { key: 'provider', label: 'Provider' },
      { key: 'createdAt', label: 'Requested Date', format: (r) => new Date(r.createdAt).toISOString() }
    ];
    return sendCSVResponse(res, `cancellation-refund-report-${Date.now()}.csv`, columns, rows);
  }

  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        totalCancellations,
        fullyCancelledCount,
        partiallyCancelledCount,
        totalCancellationCharges,
        totalRefundAmount,
        statusBreakdown: {
          pendingCount: pendingRefunds.length,
          pendingAmount: pendingRefunds.reduce((sum, r) => sum + r.refundAmount, 0),
          processingCount: processingRefunds.length,
          processingAmount: processingRefunds.reduce((sum, r) => sum + r.refundAmount, 0),
          completedCount: completedRefunds.length,
          completedAmount: completedRefunds.reduce((sum, r) => sum + r.refundAmount, 0),
          failedCount: failedRefunds.length,
          failedAmount: failedRefunds.reduce((sum, r) => sum + r.refundAmount, 0)
        }
      },
      refunds: rows
    }
  });
});

module.exports = {
  getAdminAnalyticsOverview,
  getAdminAnalyticsBookings,
  getAdminAnalyticsRevenue,
  getAdminAnalyticsOperators,
  getOperatorAnalyticsOverview,
  getOperatorAnalyticsBookings,
  getOperatorAnalyticsRevenue,
  getTripOccupancyReport,
  getPassengerManifestReport,
  getCancellationRefundReport
};
