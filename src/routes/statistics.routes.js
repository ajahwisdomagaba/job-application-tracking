import express from 'express';
import { getAttachmentStatistics } from '../controllers/statistics.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);
router.get('/attachments', getAttachmentStatistics);

export default router;
