import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      enum: ['interview', 'deadline'],
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    nextSendTime: {
      type: Date,
      required: true,
      index: true,
    },
    repeatInterval: {
      type: String,
      required: true,
      enum: ['12h', '6h', 'once'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
);

export default mongoose.model('Reminder', reminderSchema);
