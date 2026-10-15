import express from 'express';
import { publicLimiter } from '../middleware/rateLimiter.js'; // team lead's rate limiter (assumed name/path)
import { listJobs, getJob } from '../controllers/job.controller.js';

const router = express.Router();

router.get('/', publicLimiter, listJobs);
router.get('/:jobId', publicLimiter, getJob);


export default router;
