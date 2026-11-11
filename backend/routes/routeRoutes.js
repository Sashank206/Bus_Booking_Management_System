const express = require('express');
const {
  getRoutes,
  getRouteById,
  createRoute,
  toggleRouteStatus
} = require('../controllers/routeController');
const { protect, authorize } = require('../middleware/auth');
const { routeValidation } = require('../validators/routeValidator');

const router = express.Router();

// Public read: browse route network
router.get('/', getRoutes);
router.get('/:routeId', getRouteById);

// Admin-only management
router.post('/', protect, authorize('admin'), routeValidation, createRoute);
router.patch('/:routeId/status', protect, authorize('admin'), toggleRouteStatus);

module.exports = router;

