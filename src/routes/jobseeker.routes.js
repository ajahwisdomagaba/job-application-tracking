import express from 'express';
import { getJobseekerApplication } from '../controllers/application.controller.js';
import { protect, requireJobseeker } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect, requireJobseeker);
router.get('/applications/:applicationId', getJobseekerApplication);

export default router;
