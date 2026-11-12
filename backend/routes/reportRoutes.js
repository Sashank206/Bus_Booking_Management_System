const express = require('express');
const {
  getTripOccupancyReport,
  getPassengerManifestReport,
  getCancellationRefundReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Require authentication for all reporting routes
router.use(protect);

// 1. Trip Occupancy Report (Admin sees all; Operator scoped to own)
router.get('/occupancy', authorize('admin', 'operator'), getTripOccupancyReport);

// 2. Passenger Manifest Report for a specific trip (Admin or owning Operator)
router.get('/trips/:tripId/manifest', authorize('admin', 'operator'), getPassengerManifestReport);

// 3. Cancellations & Refunds Report
router.get('/cancellations-refunds', authorize('admin', 'operator'), getCancellationRefundReport);

module.exports = router;

