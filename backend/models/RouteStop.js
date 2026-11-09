const mongoose = require('mongoose');

const routeStopSchema = new mongoose.Schema(
  {
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Route reference is required']
    },
    stopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: [true, 'Stop reference is required']
    },
    stopSequence: {
      type: Number,
      required: [true, 'Stop sequence index is required'],
      min: [0, 'Sequence must be non-negative']
    },
    distanceFromStart: {
      type: Number,
      default: 0,
      min: [0, 'Distance from start cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

// Indexes
routeStopSchema.index({ routeId: 1, stopSequence: 1 }, { unique: true });
routeStopSchema.index({ routeId: 1, stopId: 1 });

const RouteStop = mongoose.model('RouteStop', routeStopSchema);

module.exports = RouteStop;

