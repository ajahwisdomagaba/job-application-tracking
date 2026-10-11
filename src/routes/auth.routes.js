import express from 'express';
import { login} from '../middlewares/auth.controller.js';
import { loginLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

router.post('/login', loginLimiter, login);

export default router;