import { v2 as cloudinary } from 'cloudinary';

const requiredKeys = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

export const configureCloudinary = () => {
  const missingKeys = requiredKeys.filter((key) => {
    const value = process.env[key];
    return !value || value.startsWith('your_');
  });

  if (missingKeys.length > 0) {
    const error = new Error(
      `Cloudinary is not configured. Set: ${missingKeys.join(', ')}`,
    );
    error.statusCode = 503;
    throw error;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
};

export default cloudinary;
