const express = require('express');
const {
  holdSeats,
  releaseHold,
  createBooking,
  getMyBookings,
  getBookingById
} = require('../controllers/bookingController');
const { protect, optionalProtect } = require('../middleware/auth');
const { holdValidation, bookingValidation } = require('../validators/bookingValidator');

const router = express.Router();

// Hold Management
router.post('/hold', protect, holdValidation, holdSeats);
router.post('/release-hold', optionalProtect, releaseHold);

// Customer Bookings
router.post('/', protect, bookingValidation, createBooking);
router.get('/my-bookings', protect, getMyBookings);
router.get('/:bookingId', protect, getBookingById);

module.exports = router;

