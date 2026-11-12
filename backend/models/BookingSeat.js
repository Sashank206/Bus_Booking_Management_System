const mongoose = require('mongoose');

const bookingSeatSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required']
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Passenger',
      required: [true, 'Passenger reference is required']
    },
    seatInventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeatInventory',
      required: [true, 'Seat inventory reference is required']
    },
    boardingStopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: [true, 'Boarding stop reference is required']
    },
    droppingStopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: [true, 'Dropping stop reference is required']
    },
    fromSequence: {
      type: Number,
      required: [true, 'Origin stop sequence is required'],
      min: [0, 'Sequence cannot be negative']
    },
    toSequence: {
      type: Number,
      required: [true, 'Destination stop sequence is required'],
      min: [0, 'Sequence cannot be negative']
    },
    seatNumber: {
      type: String,
      required: [true, 'Seat number is required'],
      trim: true
    },
    segmentFare: {
      type: Number,
      required: [true, 'Segment fare is required'],
      min: [0, 'Fare cannot be negative']
    },
    allocationStatus: {
      type: String,
      enum: {
        values: ['held', 'confirmed', 'released', 'expired', 'cancelled'],
        message: '{VALUE} is not a valid allocation status'
      },
      default: 'held'
    },
    holdExpiresAt: {
      type: Date
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

// Sequence validation: fromSequence < toSequence
bookingSeatSchema.pre('validate', function (next) {
  if (this.fromSequence != null && this.toSequence != null && this.fromSequence >= this.toSequence) {
    this.invalidate('toSequence', 'Dropping stop sequence must be greater than boarding stop sequence.');
  }
  if (typeof next === 'function') next();
});

// Indexes (Note: DO NOT create a unique index on seatInventoryId, as segment reuse is permitted)
bookingSeatSchema.index({ bookingId: 1 });
bookingSeatSchema.index({ seatInventoryId: 1, allocationStatus: 1 });
bookingSeatSchema.index({ passengerId: 1, allocationStatus: 1 });

const BookingSeat = mongoose.model('BookingSeat', bookingSeatSchema);

module.exports = BookingSeat;

