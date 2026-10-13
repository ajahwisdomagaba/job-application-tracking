import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    roundNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    timeZone: {
      type: String,
      required: true,
      default: 'Africa/Lagos',
    },
    type: {
      type: String,
      enum: ['phone', 'video', 'in-person'],
      required: true,
    },
    locationOrLink: {
      type: String,
      required: true,
    },
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Rescheduled', 'Cancelled'],
      default: 'Scheduled',
    },
  },
  { timestamps: true },
);

export default mongoose.model('Interview', interviewSchema);
