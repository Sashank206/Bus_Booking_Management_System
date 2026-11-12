const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      trim: true,
      maxlength: [150, 'Route name cannot exceed 150 characters']
    },
    sourceStopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: [true, 'Source stop reference is required']
    },
    destinationStopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: [true, 'Destination stop reference is required']
    },
    distanceKm: {
      type: Number,
      min: [0, 'Distance cannot be negative']
    },
    estimatedDurationMinutes: {
      type: Number,
      min: [0, 'Duration cannot be negative']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Source and destination stop must be different
routeSchema.pre('validate', function (next) {
  if (
    this.sourceStopId &&
    this.destinationStopId &&
    this.sourceStopId.toString() === this.destinationStopId.toString()
  ) {
    this.invalidate('destinationStopId', 'Source and destination stops must be different.');
  }
  if (typeof next === 'function') next();
});

// Indexes
routeSchema.index({ sourceStopId: 1, destinationStopId: 1, isActive: 1 });

const Route = mongoose.model('Route', routeSchema);

module.exports = Route;

