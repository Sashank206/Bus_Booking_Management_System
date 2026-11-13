const mongoose = require('mongoose');

const activeSegmentSchema = new mongoose.Schema(
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
      enum: ['held', 'confirmed'],
      default: 'held'
    },
    holdExpiresAt: {
      type: Date
    },
    holdToken: {
      type: String,
      trim: true
    },
    heldByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const seatInventorySchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required']
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
    isActive: {
      type: Boolean,
      default: true
    },
    activeSegments: [activeSegmentSchema]
  },
  {
    timestamps: true
  }
);

// Indexes
seatInventorySchema.index({ tripId: 1, seatNumber: 1 }, { unique: true });
seatInventorySchema.index({ tripId: 1, isActive: 1 });

/**
 * Pure function: Determines whether two journey intervals overlap
 * Journey intervals are half-open: [fromSequence, toSequence)
 * Overlap condition: existingFrom < requestedTo AND existingTo > requestedFrom
 */
seatInventorySchema.statics.isOverlap = function (existingFrom, existingTo, requestedFrom, requestedTo) {
  return existingFrom < requestedTo && existingTo > requestedFrom;
};

/**
 * Check if a seat is available for a requested [fromSequence, toSequence) segment
 * at a given reference time (clearing expired holds from consideration).
 */
seatInventorySchema.methods.isAvailableForSegment = function (requestedFrom, requestedTo, referenceTime = new Date()) {
  if (!this.isActive) return false;

  for (const seg of this.activeSegments) {
    // If hold has expired, it does not block the seat
    if (seg.status === 'held' && seg.holdExpiresAt && new Date(seg.holdExpiresAt) <= referenceTime) {
      continue;
    }

    // Segment overlap check: existingFrom < requestedTo AND existingTo > requestedFrom
    if (seatInventorySchema.statics.isOverlap(seg.fromSequence, seg.toSequence, requestedFrom, requestedTo)) {
      return false;
    }
  }

  return true;
};

const SeatInventory = mongoose.model('SeatInventory', seatInventorySchema);

module.exports = SeatInventory;

