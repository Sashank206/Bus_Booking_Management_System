const {
  User,
  Operator,
  Bus,
  Trip,
  Booking,
  AuditLog,
  Payment,
  Cancellation,
  Refund,
  Notification
} = require('../models');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');
const { getCancellationPolicy, updateCancellationPolicy } = require('../services/policyService');
const { updateTripLifecycleStatuses } = require('../services/tripLifecycleService');
const {
  cleanupExpiredHolds,
  archiveEligibleInventories,
  getInventoryStorageStats
} = require('../services/inventoryLifecycleService');

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

/**
 * Get all payments for admin review with filtering & pagination
 * GET /api/admin/payments
 */
const getAdminPayments = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status && ['pending', 'successful', 'failed'].includes(status)) {
    query.paymentStatus = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate({
        path: 'bookingId',
        select: 'pnr totalAmount bookingStatus journeyDate userId',
        populate: { path: 'userId', select: 'name email phone' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Payment.countDocuments(query)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      payments,
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
 * Get all cancellations for admin monitoring
 * GET /api/admin/cancellations
 */
const getAdminCancellations = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.cancellationStatus = status;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [cancellations, total] = await Promise.all([
    Cancellation.find(query)
      .populate('bookingId', 'pnr totalAmount bookingStatus journeyDate')
      .populate('requestedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Cancellation.countDocuments(query)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      cancellations,
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
 * Get all refunds for admin management
 * GET /api/admin/refunds
 */
const getAdminRefunds = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status && ['pending', 'processing', 'completed', 'failed'].includes(status)) {
    query.refundStatus = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [refunds, total] = await Promise.all([
    Refund.find(query)
      .populate({
        path: 'cancellationId',
        populate: { path: 'bookingId', select: 'pnr totalAmount' }
      })
      .populate('paymentId', 'paymentReference paymentAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Refund.countDocuments(query)
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      refunds,
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
 * Admin: Simulate or update refund status
 * POST /api/admin/refunds/:refundId/simulate
 */
const simulateRefundStatus = asyncHandler(async (req, res, next) => {
  const { refundId } = req.params;
  const { status, reason } = req.body;

  if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
    return next(
      new AppError("Invalid refund status. Must be 'pending', 'processing', 'completed', or 'failed'.", 400)
    );
  }

  const refund = await Refund.findById(refundId).populate({
    path: 'cancellationId',
    populate: { path: 'bookingId', select: 'pnr userId' }
  });

  if (!refund) {
    return next(new AppError('Refund record not found.', 404));
  }

  const prevStatus = refund.refundStatus;

  // Duplicate status update check
  if (prevStatus === status) {
    return next(new AppError(`Refund is already in '${status}' status.`, 400));
  }

  // Terminal state check
  if (prevStatus === 'completed') {
    return next(new AppError("Cannot change refund status: 'completed' is a final terminal state.", 400));
  }

  // Transition validation
  const validTransitions = {
    pending: ['processing', 'completed', 'failed'],
    processing: ['completed', 'failed'],
    failed: ['processing', 'pending']
  };

  if (!validTransitions[prevStatus] || !validTransitions[prevStatus].includes(status)) {
    return next(
      new AppError(`Invalid refund status transition from '${prevStatus}' to '${status}'.`, 400)
    );
  }

  refund.refundStatus = status;
  if (status === 'completed') {
    refund.processedAt = new Date();
  }
  await refund.save();

  await AuditLog.create({
    userId: req.user._id,
    action: 'REFUND_STATUS_UPDATED',
    entityType: 'Refund',
    entityId: refund._id,
    description: `Refund status updated from ${prevStatus} to ${status}. Reason: ${reason || 'Admin simulation'}`
  }).catch(() => {});

  if (refund.cancellationId?.bookingId?.userId) {
    await Notification.create({
      userId: refund.cancellationId.bookingId.userId,
      bookingId: refund.cancellationId.bookingId._id,
      notificationType: status === 'completed' ? 'REFUND_COMPLETED' : 'REFUND_UPDATED',
      message: `Your refund of ₹${refund.refundAmount} (Ref: ${refund.refundReference}) is now ${status}.`
    }).catch(() => {});
  }

  res.status(200).json({
    status: 'success',
    message: `Refund status successfully updated to '${status}'.`,
    data: { refund }
  });
});

/**
 * Get active cancellation policy configuration
 * GET /api/admin/cancellation-policy
 */
const getCancellationPolicyConfig = asyncHandler(async (req, res, next) => {
  const policy = getCancellationPolicy();
  res.status(200).json({
    status: 'success',
    data: { policy }
  });
});

/**
 * Update cancellation policy configuration
 * PUT /api/admin/cancellation-policy
 */
const updateCancellationPolicyConfig = asyncHandler(async (req, res, next) => {
  try {
    const updatedPolicy = updateCancellationPolicy(req.body);

    await AuditLog.create({
      userId: req.user._id,
      action: 'POLICY_UPDATED',
      entityType: 'Cancellation',
      description: `Admin updated cancellation policy: cutoff ${updatedPolicy.cutoffHours}h, ${updatedPolicy.tiers.length} tiers`
    }).catch(() => {});

    res.status(200).json({
      status: 'success',
      message: 'Cancellation policy successfully updated.',
      data: { policy: updatedPolicy }
    });
  } catch (err) {
    return next(new AppError(err.message, 400));
  }
});

/**
 * Manually trigger trip lifecycle status update
 * POST /api/admin/trips/update-statuses
 */
const triggerTripLifecycleUpdate = asyncHandler(async (req, res, next) => {
  const result = await updateTripLifecycleStatuses();

  await AuditLog.create({
    userId: req.user._id,
    action: 'TRIP_LIFECYCLE_RUN',
    entityType: 'Trip',
    description: `Admin manually triggered trip lifecycle update. Evaluated: ${result.evaluated}, Transitions: ${result.transitions.length}`
  }).catch(() => {});

  res.status(200).json({
    status: 'success',
    message: `Trip lifecycle statuses evaluated: ${result.evaluated} evaluated, ${result.transitions.length} transitioned.`,
    data: result
  });
});

/**
 * Trigger SeatInventory cleanup and archival (supports dryRun and configurable retentionDays)
 * POST /api/admin/inventory/cleanup
 */
const triggerInventoryCleanup = asyncHandler(async (req, res, next) => {
  const { retentionDays = 180, dryRun = false } = req.body || {};
  const isDryRun = Boolean(dryRun);
  const days = Math.max(1, parseInt(retentionDays, 10) || 180);

  const holdCleanupResult = await cleanupExpiredHolds();
  const archiveResult = await archiveEligibleInventories({
    retentionDays: days,
    dryRun: isDryRun
  });

  await AuditLog.create({
    userId: req.user._id,
    action: isDryRun ? 'INVENTORY_CLEANUP_DRY_RUN' : 'INVENTORY_CLEANUP_RUN',
    entityType: 'SeatInventory',
    description: `Admin triggered inventory cleanup (dryRun: ${isDryRun}, retention: ${days} days). Expired holds: ${holdCleanupResult.releasedHoldsCount}, Archived: ${archiveResult.archivedSeatsCount}, Skipped: ${archiveResult.skippedTripsCount}`
  }).catch(() => {});

  res.status(200).json({
    status: 'success',
    message: isDryRun
      ? `Dry run completed. ${archiveResult.eligibleTripsCount} trips eligible for archival.`
      : `Inventory cleanup completed. ${archiveResult.archivedSeatsCount} seats archived across ${archiveResult.eligibleTripsCount} trips.`,
    data: {
      holdCleanup: holdCleanupResult,
      archival: archiveResult
    }
  });
});

/**
 * Get SeatInventory storage statistics and retention metrics
 * GET /api/admin/inventory/stats
 */
const getInventoryStats = asyncHandler(async (req, res, next) => {
  const retentionDays = parseInt(req.query.retentionDays, 10) || 180;
  const stats = await getInventoryStorageStats(retentionDays);

  res.status(200).json({
    status: 'success',
    data: stats
  });
});

module.exports = {
  getAdminDashboard,
  getOperators,
  getOperatorById,
  updateOperatorApproval,
  updateUserStatus,
  getAuditLogs,
  getAdminPayments,
  getAdminCancellations,
  getAdminRefunds,
  simulateRefundStatus,
  getCancellationPolicyConfig,
  updateCancellationPolicyConfig,
  triggerTripLifecycleUpdate,
  triggerInventoryCleanup,
  getInventoryStats
};
