const express = require('express');
const {
  holdSeats,
  releaseHold,
  createBooking,
  getMyBookings,
  getBookingById,
  verifyTicketByPNR,
  getBookingTicket,
  cleanupExpiredBookings
} = require('../controllers/bookingController');
const {
  cancelBookingSeats,
  getBookingCancellations
} = require('../controllers/cancellationController');
const { getBookingPayment } = require('../controllers/paymentController');
const { getBookingRefunds } = require('../controllers/refundController');
const { protect, optionalProtect } = require('../middleware/auth');
const { holdValidation, bookingValidation } = require('../validators/bookingValidator');

const router = express.Router();

// Hold Management
router.post('/hold', protect, holdValidation, holdSeats);
router.post('/release-hold', optionalProtect, releaseHold);
router.post('/cleanup-expired', protect, cleanupExpiredBookings);

// Public Ticket Verification by PNR
router.get('/verify/:pnr', optionalProtect, verifyTicketByPNR);

// Customer Bookings
router.post('/', protect, bookingValidation, createBooking);
router.get('/my-bookings', protect, getMyBookings);

// Booking Sub-resources
router.get('/:bookingId/ticket', protect, getBookingTicket);
router.post('/:bookingId/cancel', protect, cancelBookingSeats);
router.get('/:bookingId/cancellations', protect, getBookingCancellations);
router.get('/:bookingId/payment', protect, getBookingPayment);
router.get('/:bookingId/refunds', protect, getBookingRefunds);

// Booking Detail
router.get('/:bookingId', protect, getBookingById);

module.exports = router;

