const express = require('express');
const {
  simulatePayment,
  getPaymentById,
  getBookingPayment
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Enforce authentication across payments
router.use(protect);

router.post('/simulate', simulatePayment);
router.get('/:paymentId', getPaymentById);
router.get('/booking/:bookingId', getBookingPayment);

module.exports = router;

