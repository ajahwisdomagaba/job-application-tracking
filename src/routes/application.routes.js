import express from 'express';
import { 
  applyToJob, 
  getApplications,
  getJobseekerApplication,
  withdrawApplication 
} from '../controllers/application.controller.js';
import { protect, requireJobseeker } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/jobs/:jobId/apply', protect, requireJobseeker, applyToJob);
router.get('/applications', protect, requireJobseeker, getApplications);
router.get(
  '/applications/:applicationId',
  protect,
  requireJobseeker,
  getJobseekerApplication,
);
router.patch(
  '/applications/:applicationId/withdraw',
  protect,
  requireJobseeker,
  withdrawApplication,
);

export default router;