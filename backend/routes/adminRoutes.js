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
  updateCancellationPolicyConfig
} = require('../controllers/adminController');
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

module.exports = router;

