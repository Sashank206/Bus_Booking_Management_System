const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema(
  {
    cancellationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cancellation',
      required: [true, 'Cancellation reference is required']
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Original payment reference is required']
    },
    refundReference: {
      type: String,
      trim: true
    },
    refundAmount: {
      type: Number,
      required: [true, 'Refund amount is required'],
      min: [0, 'Refund amount cannot be negative']
    },
    refundStatus: {
      type: String,
      enum: {
        values: ['pending', 'processing', 'completed', 'failed'],
        message: '{VALUE} is not a valid refund status'
      },
      default: 'pending'
    },
    provider: {
      type: String,
      default: 'simulated_refund'
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
refundSchema.index({ cancellationId: 1, createdAt: -1 });
refundSchema.index({ refundStatus: 1, createdAt: 1 });

const Refund = mongoose.model('Refund', refundSchema);

module.exports = Refund;

