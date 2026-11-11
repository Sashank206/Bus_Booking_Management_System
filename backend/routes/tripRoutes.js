const express = require('express');
const {
  getTrips,
  searchTrips,
  getTripSeatAvailability,
  getTripById,
  createTrip,
  cancelTrip,
  getTripManifest
} = require('../controllers/tripController');
const {
  protect,
  optionalProtect,
  authorize,
  requireApprovedOperator
} = require('../middleware/auth');
const { tripValidation } = require('../validators/tripValidator');

const router = express.Router();

// Public Trip Search & Seat Availability
router.get('/search', searchTrips);
router.get('/:tripId/seats', getTripSeatAvailability);

// Public / Operator trip listing
router.get('/', optionalProtect, getTrips);
router.get('/:tripId', getTripById);

// Trip management (operator/admin)
router.post(
  '/',
  protect,
  authorize('operator', 'admin'),
  requireApprovedOperator,
  tripValidation,
  createTrip
);

router.patch(
  '/:tripId/cancel',
  protect,
  authorize('operator', 'admin'),
  cancelTrip
);

router.get(
  '/:tripId/manifest',
  protect,
  authorize('operator', 'admin'),
  getTripManifest
);

module.exports = router;

