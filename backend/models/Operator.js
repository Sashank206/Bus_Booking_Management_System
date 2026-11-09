const mongoose = require('mongoose');

const operatorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for operator profile'],
      unique: true
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters']
    },
    registrationNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Registration number cannot exceed 100 characters']
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: [100, 'Contact person name cannot exceed 100 characters']
    },
    businessAddress: {
      type: String,
      trim: true,
      maxlength: [300, 'Business address cannot exceed 300 characters']
    },
    approvalStatus: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected', 'suspended'],
        message: '{VALUE} is not a valid operator status'
      },
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
operatorSchema.index({ userId: 1 }, { unique: true });
operatorSchema.index({ approvalStatus: 1 });

const Operator = mongoose.model('Operator', operatorSchema);

module.exports = Operator;

