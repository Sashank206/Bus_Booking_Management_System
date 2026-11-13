const express = require('express');
const {
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
} = require('../controllers/adminController');
const {
  getAdminAnalyticsOverview,
  getAdminAnalyticsBookings,
  getAdminAnalyticsRevenue,
  getAdminAnalyticsOperators,
  getTripOccupancyReport,
  getPassengerManifestReport,
  getCancellationRefundReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Enforce authentication and Administrator RBAC across all /api/admin endpoints
router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getAdminDashboard);
router.get('/operators', getOperators);
router.get('/operators/:operatorId', getOperatorById);
router.patch('/operators/:operatorId/approval', updateOperatorApproval);
router.patch('/users/:userId/status', updateUserStatus);
router.get('/audit-logs', getAuditLogs);

// Phase 7: Payment, Cancellation, Refund Management & Policy Configuration
router.get('/payments', getAdminPayments);
router.get('/cancellations', getAdminCancellations);
router.get('/refunds', getAdminRefunds);
router.post('/refunds/:refundId/simulate', simulateRefundStatus);
router.get('/cancellation-policy', getCancellationPolicyConfig);
router.put('/cancellation-policy', updateCancellationPolicyConfig);

// Phase 8: Reports, Analytics & Dashboard APIs
router.get('/analytics/overview', getAdminAnalyticsOverview);
router.get('/analytics/bookings', getAdminAnalyticsBookings);
router.get('/analytics/revenue', getAdminAnalyticsRevenue);
router.get('/analytics/operators', getAdminAnalyticsOperators);
router.get('/reports/occupancy', getTripOccupancyReport);
router.get('/reports/cancellations', getCancellationRefundReport);
router.get('/reports/refunds', getCancellationRefundReport);
router.get('/reports/trips/:tripId/manifest', getPassengerManifestReport);

// Phase 9: Trip Lifecycle Management & Seat Inventory Cleanup
router.post('/trips/update-statuses', triggerTripLifecycleUpdate);
router.post('/inventory/cleanup', triggerInventoryCleanup);
router.get('/inventory/stats', getInventoryStats);

module.exports = router;
