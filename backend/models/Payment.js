const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required']
    },
    paymentReference: {
      type: String,
      trim: true
    },
    idempotencyKey: {
      type: String,
      trim: true
    },
    paymentMethod: {
      type: String,
      default: 'simulated_card'
    },
    paymentAmount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount cannot be negative']
    },
    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'successful', 'failed'],
        message: '{VALUE} is not a valid payment status'
      },
      default: 'pending'
    },
    provider: {
      type: String,
      default: 'simulated_gateway'
    },
    paidAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
paymentSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: 'string' } }
  }
);

paymentSchema.index(
  { paymentReference: 1 },
  {
    unique: true,
    partialFilterExpression: { paymentReference: { $type: 'string' } }
  }
);

paymentSchema.index({ bookingId: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

