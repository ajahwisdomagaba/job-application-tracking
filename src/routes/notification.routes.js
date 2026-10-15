import express from 'express';
import {
  getMyNotifications,
  markNotificationAsRead,
} from '../controllers/notification.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
router.patch('/:notificationId/read', markNotificationAsRead);

export default router;