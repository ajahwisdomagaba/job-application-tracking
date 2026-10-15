import express from 'express';
import {
  createAttachment,
  deleteAttachment,
  getAttachment,
  getAttachmentLink,
  listAttachments,
} from '../controllers/attachment.controller.js';
import { protect, requireJobseeker } from '../middlewares/auth.middleware.js';
import { uploadSingleAttachment } from '../middlewares/upload.middleware.js';

const router = express.Router();

router.use(protect);
router
  .route('/')
  .get(listAttachments)
  .post(requireJobseeker, uploadSingleAttachment, createAttachment);
router.get('/:id/link', getAttachmentLink);
router.route('/:id').get(getAttachment).delete(deleteAttachment);

export default router;
