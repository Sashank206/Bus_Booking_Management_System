const express = require('express');
const { getRefundById, getBookingRefunds } = require('../controllers/refundController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/:refundId', getRefundById);
router.get('/booking/:bookingId', getBookingRefunds);

module.exports = router;

