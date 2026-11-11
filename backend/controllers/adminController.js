const { User, Operator, Bus, Trip, Booking, AuditLog } = require('../models');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Get aggregated system statistics for Admin Dashboard
 * GET /api/admin/dashboard
 */
const getAdminDashboard = asyncHandler(async (req, res, next) => {
  const [
    totalUsers,
    totalOperators,
    pendingOperators,
    totalBuses,
    totalTrips,
    totalBookings,
    revenueAgg,
    recentPending,
    recentLogs
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    Operator.countDocuments(),
    Operator.countDocuments({ approvalStatus: 'pending' }),
    Bus.countDocuments(),
    Trip.countDocuments(),
    Booking.countDocuments(),
    Booking.aggregate([
      { $match: { bookingStatus: { $in: ['confirmed', 'partially_cancelled'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Operator.find({ approvalStatus: 'pending' })
      .populate('userId', 'name email phone createdAt')
      .sort({ createdAt: -1 })
      .limit(5),
    AuditLog.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10)
  ]);

  const simulatedRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

  res.status(200).json({
    status: 'success',
    data: {
      metrics: {
        totalUsers,
        totalOperators,
        pendingOperators,
        totalBuses,
        totalTrips,
        totalBookings,
        simulatedRevenue
      },
      recentPendingOperators: recentPending,
      recentAuditLogs: recentLogs
    }
  });
});

/**
 * List operators with search, approvalStatus filter, and pagination
 * GET /api/admin/operators
 */
const getOperators = asyncHandler(async (req, res, next) => {
  const { status, search, page = 1, limit = 10 } = req.query;

  const query = {};
  if (status && ['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
    query.approvalStatus = status;
  }

  if (search) {
    query.$or = [
      { companyName: { $regex: search, $options: 'i' } },
      { registrationNumber: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [operators, total] = await Promise.all([
    Operator.find(query)
      .populate('userId', 'name email phone accountStatus createdAt')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Operator.countDocuments(query)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      operators,
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
 * Get single operator full profile and statistics
 * GET /api/admin/operators/:operatorId
 */
const getOperatorById = asyncHandler(async (req, res, next) => {
  const { operatorId } = req.params;

  const operator = await Operator.findById(operatorId)
    .populate('userId', 'name email phone accountStatus createdAt')
    .populate('approvedBy', 'name email');

  if (!operator) {
    return next(new AppError('Operator not found with provided ID.', 404));
  }

  const [busCount, tripCount] = await Promise.all([
    Bus.countDocuments({ operatorId: operator._id }),
    Trip.countDocuments({ operatorId: operator._id })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      operator,
      stats: {
        totalBuses: busCount,
        totalTrips: tripCount
      }
    }
  });
});

/**
 * Update operator approval status (Approve / Reject)
 * PATCH /api/admin/operators/:operatorId/approval
 */
const updateOperatorApproval = asyncHandler(async (req, res, next) => {
  const { operatorId } = req.params;
  const status = req.body.status || req.body.decision;
  const remarks = req.body.remarks || req.body.rejectionReason;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return next(new AppError("Approval status must be either 'approved' or 'rejected'.", 400));
  }

  const operator = await Operator.findById(operatorId);
  if (!operator) {
    return next(new AppError('Operator profile not found.', 404));
  }

  const previousStatus = operator.approvalStatus;
  operator.approvalStatus = status;
  operator.approvedBy = req.user._id;
  operator.approvedAt = new Date();
  await operator.save();

  // Update associated user account status
  const user = await User.findById(operator.userId);
  if (user) {
    user.accountStatus = status === 'approved' ? 'active' : 'rejected';
    await user.save();
  }

  // Create audit log
  await AuditLog.create({
    userId: req.user._id,
    action: status === 'approved' ? 'OPERATOR_APPROVED' : 'OPERATOR_REJECTED',
    entityType: 'Operator',
    entityId: operator._id,
    description: `Operator '${operator.companyName}' status changed from ${previousStatus} to ${status}. ${remarks || ''}`.trim(),
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  }).catch((err) => console.warn('[Audit Warning] Could not record operator approval:', err.message));

  res.status(200).json({
    status: 'success',
    message: `Operator '${operator.companyName}' has been successfully ${status}.`,
    data: { operator }
  });
});

/**
 * Suspend or reactivate user/operator account
 * PATCH /api/admin/users/:userId/status
 */
const updateUserStatus = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { status, reason } = req.body;

  if (!status || !['active', 'suspended'].includes(status)) {
    return next(new AppError("Status must be either 'active' or 'suspended'.", 400));
  }

  // Prevent an admin from suspending themselves
  if (req.user._id.toString() === userId.toString()) {
    return next(new AppError('Administrators cannot suspend their own account.', 400));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  const prevStatus = user.accountStatus;
  user.accountStatus = status;
  await user.save();

  // If user is an operator, mirror status on Operator profile
  if (user.role === 'operator') {
    const operator = await Operator.findOne({ userId: user._id });
    if (operator) {
      operator.approvalStatus = status === 'suspended' ? 'suspended' : 'approved';
      await operator.save();
    }
  }

  // Create audit log
  await AuditLog.create({
    userId: req.user._id,
    action: status === 'suspended' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
    entityType: 'User',
    entityId: user._id,
    description: `User '${user.email}' (${user.role}) changed from ${prevStatus} to ${status}. Reason: ${reason || 'Administrative action'}`,
    ipAddress: req.ip || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent']
  }).catch((err) => console.warn('[Audit Warning] Could not record user status change:', err.message));

  res.status(200).json({
    status: 'success',
    message: `Account status for '${user.email}' updated to ${status}.`,
    data: { user }
  });
});

/**
 * Query system audit logs with pagination and filters
 * GET /api/admin/audit-logs
 */
const getAuditLogs = asyncHandler(async (req, res, next) => {
  const { action, entityType, page = 1, limit = 20 } = req.query;

  const query = {};
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    AuditLog.countDocuments(query)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

module.exports = {
  getAdminDashboard,
  getOperators,
  getOperatorById,
  updateOperatorApproval,
  updateUserStatus,
  getAuditLogs
};
