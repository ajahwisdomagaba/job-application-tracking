import express from 'express';
import { confirmEmail, login, register, resendConfirmation } from '../middlewares/auth.controller.js';
import { loginLimiter, publicApiLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

router.post('/register', publicApiLimiter, register);
router.get('/confirm-email', publicApiLimiter, confirmEmail);
router.post('/resend-confirmation', publicApiLimiter, resendConfirmation);
router.post('/login', loginLimiter, login);

export default router;
