import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient reference is required'],
      index: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Application reference is required'],
      index: true,
    },
    source: {
      type: String,
      required: [true, 'Source is required'],
      enum: ['interview', 'deadline'],
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Source ID is required'],
    },
    nextSendTime: {
      type: Date,
      required: [true, 'Next send time is required'],
      index: true,
    },
    repeatInterval: {
      type: String,
      required: [true, 'Repeat interval is required'],
      enum: ['12h', '6h', 'once'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
);

reminderSchema.index({ recipient: 1, application: 1, source: 1, sourceId: 1 });
reminderSchema.index({ recipient: 1, isActive: 1 });
reminderSchema.index({ nextSendTime: 1, isActive: 1 });
reminderSchema.index({ createdAt: -1 });

export default mongoose.model('Reminder', reminderSchema);
