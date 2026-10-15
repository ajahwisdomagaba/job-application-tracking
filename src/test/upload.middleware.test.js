import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedAttachmentTypes,
  getExtension,
  isAllowedAttachment,
  maxAttachmentSizeMb,
} from '../middlewares/upload.middleware.js';

test('getExtension normalizes file extensions', () => {
  assert.equal(getExtension('Resume.PDF'), 'pdf');
  assert.equal(getExtension('archive'), '');
});

test('attachment validation requires matching MIME type and extension', () => {
  assert.equal(
    isAllowedAttachment({
      mimetype: 'application/pdf',
      originalname: 'resume.pdf',
    }),
    true,
  );
  assert.equal(
    isAllowedAttachment({
      mimetype: 'application/msword',
      originalname: 'resume.doc',
    }),
    true,
  );
  assert.equal(
    isAllowedAttachment({
      mimetype:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      originalname: 'resume.docx',
    }),
    true,
  );
  assert.equal(
    isAllowedAttachment({
      mimetype: 'application/pdf',
      originalname: 'malware.exe',
    }),
    false,
  );
  assert.equal(
    isAllowedAttachment({
      mimetype: 'image/png',
      originalname: 'portfolio.png',
    }),
    false,
  );
});

test('upload contract allows only PDF, DOC, and DOCX at 5 MB by default', () => {
  assert.deepEqual(
    [...allowedAttachmentTypes.values()].flat().sort(),
    ['doc', 'docx', 'pdf'],
  );
  assert.equal(maxAttachmentSizeMb, 5);
});
