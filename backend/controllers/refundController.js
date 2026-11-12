const { Refund, Cancellation, Booking, Payment } = require('../models');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Get Refund by ID
 * GET /api/refunds/:refundId
 */
const getRefundById = asyncHandler(async (req, res, next) => {
  const { refundId } = req.params;

  const refund = await Refund.findById(refundId)
    .populate({
      path: 'cancellationId',
      populate: { path: 'bookingId', select: 'pnr userId totalAmount' }
    })
    .populate('paymentId', 'paymentReference paymentMethod paymentAmount');

  if (!refund) {
    return next(new AppError('Refund record not found.', 404));
  }

  // Ownership verification
  const bookingUserId = refund.cancellationId?.bookingId?.userId;
  if (req.user.role !== 'admin' && bookingUserId?.toString() !== req.user._id.toString()) {
    return next(new AppError('Forbidden. You do not have permission to view this refund.', 403));
  }

  res.status(200).json({
    status: 'success',
    data: { refund }
  });
});

/**
 * Get Refunds for a specific booking
 * GET /api/refunds/booking/:bookingId
 */
const getBookingRefunds = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError('Booking not found.', 404));
  }

  if (req.user.role !== 'admin' && booking.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('Forbidden. You do not have permission to view refunds for this booking.', 403));
  }

  const cancellations = await Cancellation.find({ bookingId: booking._id });
  const cancellationIds = cancellations.map((c) => c._id);

  const refunds = await Refund.find({ cancellationId: { $in: cancellationIds } })
    .populate('paymentId', 'paymentReference paymentAmount')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: { refunds }
  });
});

module.exports = {
  getRefundById,
  getBookingRefunds
};

