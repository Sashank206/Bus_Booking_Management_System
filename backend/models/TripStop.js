const mongoose = require('mongoose');

const tripStopSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required']
    },
    stopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: [true, 'Stop reference is required']
    },
    stopSequence: {
      type: Number,
      required: [true, 'Stop sequence is required'],
      min: [0, 'Sequence must be non-negative']
    },
    arrivalTime: {
      type: Date
    },
    departureTime: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
tripStopSchema.index({ tripId: 1, stopSequence: 1 }, { unique: true });
tripStopSchema.index({ tripId: 1, stopId: 1 });

const TripStop = mongoose.model('TripStop', tripStopSchema);

module.exports = TripStop;

