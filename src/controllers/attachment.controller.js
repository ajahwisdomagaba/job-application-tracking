import Attachment from '../models/Attachment.js';
import { getExtension } from '../middlewares/upload.middleware.js';
import {
  createPrivateDownloadUrl,
  deletePrivateRawFile,
  uploadPrivateRawFile,
} from '../services/attachmentStorage.service.js';

const purposes = new Set([
  'resume',
  'cover_letter',
  'portfolio',
  'verification_document',
  'other',
]);

const canAccess = (attachment, user) =>
  user.role === 'admin' || attachment.owner.toString() === user._id.toString();

const findAccessibleAttachment = async (id, user, includeStorageFields = false) => {
  const query = Attachment.findById(id);
  if (includeStorageFields) query.select('+publicId +assetId');
  const attachment = await query;

  if (!attachment) {
    const error = new Error('Attachment not found');
    error.statusCode = 404;
    throw error;
  }

  if (!canAccess(attachment, user)) {
    const error = new Error('You do not have access to this attachment');
    error.statusCode = 403;
    throw error;
  }

  return attachment;
};

export const createAttachment = async (req, res, next) => {
  let uploadedFile;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'A file is required in the file form-data field',
      });
    }

    const purpose = req.body.purpose || 'other';
    if (!purposes.has(purpose)) {
      return res.status(400).json({
        success: false,
        message: `purpose must be one of: ${[...purposes].join(', ')}`,
      });
    }

    uploadedFile = await uploadPrivateRawFile(req.file, req.user._id.toString());

    const attachment = await Attachment.create({
      owner: req.user._id,
      originalName: req.file.originalname,
      publicId: uploadedFile.public_id,
      assetId: uploadedFile.asset_id,
      resourceType: 'raw',
      deliveryType: 'authenticated',
      format: uploadedFile.format || getExtension(req.file.originalname),
      mimeType: req.file.mimetype,
      bytes: uploadedFile.bytes || req.file.size,
      purpose,
    });

    const responseAttachment = attachment.toObject();
    delete responseAttachment.publicId;
    delete responseAttachment.assetId;

    return res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully',
      data: responseAttachment,
    });
  } catch (error) {
    if (uploadedFile?.public_id) {
      try {
        await deletePrivateRawFile(uploadedFile.public_id);
      } catch (cleanupError) {
        console.error('Could not roll back Cloudinary upload:', cleanupError.message);
      }
    }
    return next(error);
  }
};

export const listAttachments = async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const filter = { owner: req.user._id };

    if (req.query.purpose) {
      if (!purposes.has(req.query.purpose)) {
        return res.status(400).json({
          success: false,
          message: `purpose must be one of: ${[...purposes].join(', ')}`,
        });
      }
      filter.purpose = req.query.purpose;
    }

    const [attachments, total] = await Promise.all([
      Attachment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Attachment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: attachments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getAttachment = async (req, res, next) => {
  try {
    const attachment = await findAccessibleAttachment(req.params.id, req.user);
    return res.status(200).json({ success: true, data: attachment });
  } catch (error) {
    return next(error);
  }
};

export const getAttachmentLink = async (req, res, next) => {
  try {
    const attachment = await findAccessibleAttachment(
      req.params.id,
      req.user,
      true,
    );
    const configuredValue = Number(process.env.SIGNED_LINK_TTL_SECONDS || 300);
    const configuredTtl = Number.isFinite(configuredValue)
      ? Math.min(Math.max(Math.floor(configuredValue), 60), 3600)
      : 300;
    const requestedTtl = Number(req.query.ttl || configuredTtl);
    const ttlSeconds = Math.min(
      Math.max(Number.isFinite(requestedTtl) ? Math.floor(requestedTtl) : configuredTtl, 60),
      3600,
    );
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    const url = createPrivateDownloadUrl(
      attachment.publicId,
      attachment.format,
      expiresAt,
    );

    return res.status(200).json({
      success: true,
      data: {
        url,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        ttlSeconds,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteAttachment = async (req, res, next) => {
  try {
    const attachment = await findAccessibleAttachment(
      req.params.id,
      req.user,
      true,
    );
    await deletePrivateRawFile(attachment.publicId);
    await attachment.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
};
