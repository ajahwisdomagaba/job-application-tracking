import express from 'express';
import { getMe, updateMe } from '../middlewares/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { apiLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

router.use(apiLimiter);
router.use(protect);
router.route('/me').get(getMe).patch(updateMe);


export default router;