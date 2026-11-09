const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema(
  {
    stopName: {
      type: String,
      required: [true, 'Stop name is required'],
      trim: true,
      maxlength: [150, 'Stop name cannot exceed 150 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters']
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters']
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
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

// Indexes
stopSchema.index({ city: 1, stopName: 1 });
stopSchema.index({ stopName: 'text', city: 'text' });

const Stop = mongoose.model('Stop', stopSchema);

module.exports = Stop;

