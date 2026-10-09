import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPost',
      required: true,
      index: true,
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    currentStage: {
      type: String,
      enum: ['Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
      default: 'Applied',
    },
    applicationDeadline: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent job seekers from applying to the same job twice
applicationSchema.index({ owner: 1, job: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema);
