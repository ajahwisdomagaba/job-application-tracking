import express from 'express';
import {
  scheduleInterview,
  updateApplicationDeadline,
  updateInterview,
} from '../controllers/application.controller.js';
import { protect, requireRecruiter } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect, requireRecruiter);
router.post('/applications/:applicationId/interviews', scheduleInterview);
router.patch('/applications/:applicationId/interviews/:interviewId', updateInterview);
router.patch('/applications/:applicationId/deadline', updateApplicationDeadline);

export default router;
