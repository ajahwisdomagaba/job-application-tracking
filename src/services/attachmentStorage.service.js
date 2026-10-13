import { Readable } from 'node:stream';
import 'dotenv/config';
import { configureCloudinary } from '../config/cloudinary.js';

const uploadFolder =
  process.env.CLOUDINARY_UPLOAD_FOLDER || 'job-tracker/attachments';

export const uploadPrivateRawFile = (file, ownerId) => {
  const client = configureCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        resource_type: 'raw',
        type: 'authenticated',
        folder: `${uploadFolder}/${ownerId}`,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        filename_override: file.originalname,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
};

export const deletePrivateRawFile = async (publicId) => {
  const client = configureCloudinary();
  const result = await client.uploader.destroy(publicId, {
    resource_type: 'raw',
    type: 'authenticated',
    invalidate: true,
  });

  if (!['ok', 'not found'].includes(result.result)) {
    throw new Error(`Cloudinary deletion failed: ${result.result}`);
  }

  return result;
};

export const createPrivateDownloadUrl = (
  publicId,
  format,
  expiresAt,
) => {
  const client = configureCloudinary();
  return client.utils.private_download_url(publicId, format, {
    resource_type: 'raw',
    type: 'authenticated',
    attachment: true,
    expires_at: expiresAt,
  });
};
