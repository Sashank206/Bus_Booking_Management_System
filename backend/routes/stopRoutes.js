const express = require('express');
const {
  getStops,
  getStopById,
  createStop,
  updateStop,
  toggleStopStatus
} = require('../controllers/stopController');
const { protect, authorize } = require('../middleware/auth');
const { stopValidation } = require('../validators/stopValidator');

const router = express.Router();

// Public route: everyone can browse active stops
router.get('/', getStops);
router.get('/:stopId', getStopById);

// Admin-only management
router.post('/', protect, authorize('admin'), stopValidation, createStop);
router.put('/:stopId', protect, authorize('admin'), stopValidation, updateStop);
router.patch('/:stopId/status', protect, authorize('admin'), toggleStopStatus);

module.exports = router;

