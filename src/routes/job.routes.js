import express from 'express';
import { publicApiLimiter } from '../middlewares/rateLimiter.middleware.js';
import { listJobs, getJob } from '../controllers/job.controller.js';

const router = express.Router();

router.get('/', publicApiLimiter, listJobs);
router.get('/:jobId', publicApiLimiter, getJob);


export default router;
