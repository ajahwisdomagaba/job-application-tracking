import path from 'node:path';
import 'dotenv/config';
import multer from 'multer';

export const allowedAttachmentTypes = new Map([
  ['application/pdf', ['pdf']],
  ['application/msword', ['doc']],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ['docx'],
  ],
  ['text/plain', ['txt']],
  ['text/csv', ['csv']],
  ['application/vnd.ms-excel', ['xls']],
  [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ['xlsx'],
  ],
  ['image/jpeg', ['jpg', 'jpeg']],
  ['image/png', ['png']],
]);

export const getExtension = (filename = '') =>
  path.extname(filename).slice(1).toLowerCase();

export const isAllowedAttachment = (file) => {
  const extensions = allowedAttachmentTypes.get(file.mimetype?.toLowerCase());
  return Boolean(extensions?.includes(getExtension(file.originalname)));
};

const parsedMaxSize = Number(process.env.MAX_ATTACHMENT_SIZE_MB || 10);
export const maxAttachmentSizeMb =
  Number.isFinite(parsedMaxSize) && parsedMaxSize > 0 ? parsedMaxSize : 10;

export const uploadSingleAttachment = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.floor(maxAttachmentSizeMb * 1024 * 1024),
    files: 1,
    fields: 2,
    parts: 3,
  },
  fileFilter: (req, file, callback) => {
    if (!isAllowedAttachment(file)) {
      const error = new Error(
        'Unsupported file. Allowed formats: PDF, DOC, DOCX, TXT, CSV, XLS, XLSX, JPG, JPEG, PNG.',
      );
      error.statusCode = 415;
      return callback(error);
    }

    return callback(null, true);
  },
}).single('file');
