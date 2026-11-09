const mongoose = require('mongoose');

const cancellationItemSchema = new mongoose.Schema(
  {
    cancellationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cancellation',
      required: [true, 'Cancellation reference is required']
    },
    bookingSeatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingSeat',
      required: [true, 'Booking seat allocation reference is required']
    },
    cancellationCharge: {
      type: Number,
      required: [true, 'Cancellation charge is required'],
      min: [0, 'Cancellation charge cannot be negative']
    },
    refundAmount: {
      type: Number,
      required: [true, 'Refund amount is required'],
      min: [0, 'Refund amount cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

// Indexes
cancellationItemSchema.index({ cancellationId: 1, bookingSeatId: 1 }, { unique: true });
cancellationItemSchema.index({ bookingSeatId: 1 });

const CancellationItem = mongoose.model('CancellationItem', cancellationItemSchema);

module.exports = CancellationItem;

