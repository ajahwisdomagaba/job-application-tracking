import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getExtension,
  isAllowedAttachment,
} from '../src/middlewares/upload.middleware.js';

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
      mimetype: 'application/pdf',
      originalname: 'malware.exe',
    }),
    false,
  );
  assert.equal(
    isAllowedAttachment({
      mimetype: 'application/x-msdownload',
      originalname: 'malware.exe',
    }),
    false,
  );
});
