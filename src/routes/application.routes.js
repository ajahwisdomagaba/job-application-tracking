import express from 'express';
import { 
  applyToJob, 
  getApplications, 
  withdrawApplication 
} from '../controllers/application.controller.js';
import { protect, requireJobseeker } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply middleware to all routes in this file
router.use(protect);
router.use(requireJobseeker);

// POST /api/v1/jobs/:jobId/apply
router.post('/jobs/:jobId/apply', applyToJob);

// GET /api/v1/applications
router.get('/applications', getApplications);

// PATCH /api/v1/applications/:applicationId/withdraw
router.patch('/applications/:applicationId/withdraw', withdrawApplication);

export default router;