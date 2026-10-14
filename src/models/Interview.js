import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Application is required'],
      index: true,
    },
    roundNumber: {
      type: Number,
      required: [true, 'Interview round number is required'],
      default: 1,
      min: [1, 'Interview round number must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Interview round number must be an integer',
      },
    },
    dateTime: {
      type: Date,
      required: [true, 'Interview date and time are required'],
    },
    timeZone: {
      type: String,
      required: [true, 'Interview time zone is required'],
      default: 'Africa/Lagos',
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Interview type is required'],
      enum: ['phone', 'video', 'in-person'],
    },
    locationOrLink: {
      type: String,
      required: [true, 'Interview location or link is required'],
      trim: true,
    },
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recruiter is required'],
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Rescheduled', 'Cancelled'],
      default: 'Scheduled',
    },
  },
  { timestamps: true }
);

interviewSchema.index({ application: 1, roundNumber: 1 }, { unique: true });

export default mongoose.model('Interview', interviewSchema);
