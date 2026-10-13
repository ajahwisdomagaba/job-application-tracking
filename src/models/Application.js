import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    currentStage: {
      type: String,
      enum: ['Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
      default: 'Applied',
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model('Application', applicationSchema);
