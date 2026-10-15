import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
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
      required: [true, 'Application reference is required'],
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: [
        'new_application',
        'interview_set',
        'interview_changed',
        'stage_changed',
        'deadline_set',
        'reminder',
      ],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  { versionKey: false, timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ recipient: 1, application: 1, type: 1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
