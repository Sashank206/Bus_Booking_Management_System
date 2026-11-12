const express = require('express');
const { getOperatorDashboard } = require('../controllers/operatorDashboardController');
const {
  getOperatorAnalyticsOverview,
  getOperatorAnalyticsBookings,
  getOperatorAnalyticsRevenue,
  getTripOccupancyReport,
  getPassengerManifestReport
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('operator', 'admin'));

router.get('/dashboard', getOperatorDashboard);

// Phase 8: Operator Analytics & Reports
router.get('/analytics/overview', getOperatorAnalyticsOverview);
router.get('/analytics/bookings', getOperatorAnalyticsBookings);
router.get('/analytics/revenue', getOperatorAnalyticsRevenue);
router.get('/reports/occupancy', getTripOccupancyReport);
router.get('/reports/trips/:tripId/manifest', getPassengerManifestReport);

module.exports = router;
