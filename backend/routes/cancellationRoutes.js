const express = require('express');
const {
  cancelBookingSeats,
  getBookingCancellations,
  getCancellationById
} = require('../controllers/cancellationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/:cancellationId', getCancellationById);
router.post('/booking/:bookingId/cancel', cancelBookingSeats);
router.get('/booking/:bookingId', getBookingCancellations);

module.exports = router;

