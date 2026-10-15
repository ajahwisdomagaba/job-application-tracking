import rateLimit from 'express-rate-limit';

const windowMessage = {
    success: false,
    message: 'Too many requests. Please slow down.',
};

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: {
        success: false,
        message: 'Too many failed login attempts. Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const publicApiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    message: windowMessage,
    standardHeaders: true,
    legacyHeaders: false,
});

export const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    message: windowMessage,
    standardHeaders: true,
    legacyHeaders: false,
});