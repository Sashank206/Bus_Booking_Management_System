const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus reference is required']
    },
    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Operator',
      required: [true, 'Operator reference is required']
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Route reference is required']
    },
    travelDate: {
      type: Date,
      required: [true, 'Travel date is required']
    },
    departureTime: {
      type: Date,
      required: [true, 'Departure time is required']
    },
    arrivalTime: {
      type: Date,
      required: [true, 'Arrival time is required']
    },
    baseFare: {
      type: Number,
      required: [true, 'Base fare is required'],
      min: [0, 'Fare cannot be negative']
    },
    tripStatus: {
      type: String,
      enum: {
        values: ['scheduled', 'boarding', 'in_progress', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid trip status'
      },
      default: 'scheduled'
    }
  },
  {
    timestamps: true
  }
);

// Departure must precede arrival
tripSchema.pre('validate', function (next) {
  if (this.departureTime && this.arrivalTime && this.departureTime >= this.arrivalTime) {
    this.invalidate('arrivalTime', 'Arrival time must be after departure time.');
  }
  next();
});

// Indexes
tripSchema.index({ routeId: 1, travelDate: 1, tripStatus: 1 });
tripSchema.index({ operatorId: 1, travelDate: 1 });
tripSchema.index({ busId: 1, travelDate: 1 });

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;

