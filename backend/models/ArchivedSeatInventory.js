const mongoose = require('mongoose');

const archivedSeatSegmentSchema = new mongoose.Schema(
  {
    bookingSeatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingSeat'
    },
    fromSequence: {
      type: Number,
      required: true
    },
    toSequence: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      default: 'confirmed'
    },
    holdExpiresAt: {
      type: Date
    },
    holdToken: {
      type: String
    },
    heldByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date
    }
  },
  { _id: true }
);

const archivedSeatInventorySchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required'],
      index: true
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus'
    },
    seatNumber: {
      type: String,
      required: [true, 'Seat number is required'],
      trim: true
    },
    seatType: {
      type: String,
      enum: ['seater', 'sleeper', 'semi_sleeper'],
      default: 'seater'
    },
    originalSeatInventoryId: {
      type: mongoose.Schema.Types.ObjectId
    },
    activeSegments: [archivedSeatSegmentSchema],
    archivedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    collection: 'archived_seat_inventories',
    timestamps: true
  }
);

// Compound index to ensure idempotent archival without duplicates
archivedSeatInventorySchema.index({ tripId: 1, seatNumber: 1 }, { unique: true });

const ArchivedSeatInventory = mongoose.models.ArchivedSeatInventory || mongoose.model('ArchivedSeatInventory', archivedSeatInventorySchema);

module.exports = ArchivedSeatInventory;

