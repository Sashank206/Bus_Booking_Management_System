const express = require('express');
const {
  getAdminDashboard,
  getOperators,
  getOperatorById,
  updateOperatorApproval,
  updateUserStatus,
  getAuditLogs
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

module.exports = router;

