import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobSeekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    currentStage: {
      type: String,
      enum: ['Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
      default: 'Applied',
      index: true,
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

applicationSchema.index({ jobSeekerId: 1, createdAt: -1 });

export default mongoose.model('Application', applicationSchema);
