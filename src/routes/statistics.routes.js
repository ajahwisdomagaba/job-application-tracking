import express from 'express';
import {
  getAttachmentStatistics,
  getJobseekerStatistics,
} from '../controllers/statistics.controller.js';
import { protect, requireAdmin, requireJobseeker } from '../middlewares/auth.middleware.js';
import { apiLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

const requireAdminForGlobalScope = (req, res, next) => {
  if (req.query.scope === 'all') {
    return requireAdmin(req, res, next);
  }
  return next();
};

router.use(apiLimiter);
router.use(protect);
router.get('/', requireJobseeker, getJobseekerStatistics);
router.get('/attachments', requireAdminForGlobalScope, getAttachmentStatistics);

export default router;
