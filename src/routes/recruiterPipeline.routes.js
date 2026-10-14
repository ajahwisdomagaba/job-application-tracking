import express from 'express';
import { protect, requireRecruiter } from '../middlewares/auth.middleware.js';
import { updateApplicationStatus } from '../controllers/recruiterStatus.controller.js';

const router = express.Router();

router.patch('/applications/:applicationId/status', protect, requireRecruiter, updateApplicationStatus);

export default router;
