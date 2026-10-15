import express from 'express';
import { protect, requireRecruiter } from '../middlewares/auth.middleware.js';
import { apiLimiter } from '../middlewares/rateLimiter.middleware.js';
import { updateApplicationStatus } from '../controllers/recruiterStatus.controller.js';

const router = express.Router();

router.use(apiLimiter);
router.patch('/applications/:applicationId/status', protect, requireRecruiter, updateApplicationStatus);

export default router;
