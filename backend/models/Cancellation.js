const mongoose = require('mongoose');

const cancellationSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required']
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester reference is required']
    },
    cancellationStatus: {
      type: String,
      enum: {
        values: ['requested', 'approved', 'processed', 'rejected'],
        message: '{VALUE} is not a valid cancellation status'
      },
      default: 'processed'
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [300, 'Reason cannot exceed 300 characters']
    },
    policySnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Cancellation policy snapshot is required']
    },
    totalCancellationCharge: {
      type: Number,
      default: 0,
      min: [0, 'Cancellation charge cannot be negative']
    },
    totalRefundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refund amount cannot be negative']
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
cancellationSchema.index({ bookingId: 1, requestedAt: -1 });
cancellationSchema.index({ cancellationStatus: 1, requestedAt: 1 });

const Cancellation = mongoose.model('Cancellation', cancellationSchema);

module.exports = Cancellation;

