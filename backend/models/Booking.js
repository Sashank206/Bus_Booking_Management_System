const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    pnr: {
      type: String,
      required: [true, 'PNR is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9]{6,12}$/, 'PNR must be 6 to 12 uppercase alphanumeric characters']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required']
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required']
    },
    bookingStatus: {
      type: String,
      enum: {
        values: [
          'pending_payment',
          'confirmed',
          'partially_cancelled',
          'cancelled',
          'expired',
          'failed'
        ],
        message: '{VALUE} is not a valid booking status'
      },
      default: 'pending_payment'
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    bookingDate: {
      type: Date,
      default: Date.now
    },
    confirmedAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
bookingSchema.index({ pnr: 1 }, { unique: true });
bookingSchema.index({ userId: 1, bookingDate: -1 });
bookingSchema.index({ tripId: 1, bookingStatus: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;

