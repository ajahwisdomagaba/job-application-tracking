import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    assetId: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    resourceType: {
      type: String,
      enum: ['raw'],
      default: 'raw',
    },
    deliveryType: {
      type: String,
      enum: ['authenticated'],
      default: 'authenticated',
    },
    format: {
      type: String,
      required: true,
      lowercase: true,
    },
    mimeType: {
      type: String,
      required: true,
      lowercase: true,
    },
    bytes: {
      type: Number,
      required: true,
      min: 1,
    },
    purpose: {
      type: String,
      enum: [
        'resume',
        'cover_letter',
        'portfolio',
        'verification_document',
        'other',
      ],
      default: 'other',
      index: true,
    },
  },
  { timestamps: true },
);

attachmentSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.model('Attachment', attachmentSchema);
