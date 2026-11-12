const mongoose = require('mongoose');

const seatDefinitionSchema = new mongoose.Schema(
  {
    seatNumber: {
      type: String,
      required: true,
      trim: true
    },
    row: {
      type: Number,
      required: true
    },
    col: {
      type: Number,
      required: true
    },
    deck: {
      type: Number,
      default: 1
    },
    seatType: {
      type: String,
      enum: ['seater', 'sleeper', 'semi_sleeper'],
      default: 'seater'
    }
  },
  { _id: false }
);

const busSchema = new mongoose.Schema(
  {
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Operator',
      required: [true, 'Operator reference is required']
    },
    busNumber: {
      type: String,
      required: [true, 'Bus number or fleet code is required'],
      trim: true
    },
    busName: {
      type: String,
      trim: true
    },
    busType: {
      type: String,
      required: [true, 'Bus type is required (e.g., AC Sleeper, AC Seater)'],
      trim: true
    },
    registrationNumber: {
      type: String,
      required: [true, 'Vehicle registration number is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    totalSeats: {
      type: Number,
      required: [true, 'Total seats must be specified'],
      min: [1, 'Bus must have at least 1 seat']
    },
    seatLayout: {
      rows: { type: Number, default: 10 },
      columns: { type: Number, default: 4 },
      deckCount: { type: Number, default: 1 },
      seats: [seatDefinitionSchema]
    },
    amenities: [
      {
        type: String,
        trim: true
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
busSchema.index({ operatorId: 1, isActive: 1 });

const Bus = mongoose.model('Bus', busSchema);

module.exports = Bus;

