import express from 'express';
import {
  getAttachmentStatistics,
  getJobseekerStatistics,
} from '../controllers/statistics.controller.js';
import { protect, requireJobseeker } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.get('/', requireJobseeker, getJobseekerStatistics);
router.get('/attachments', getAttachmentStatistics);

export default router;
