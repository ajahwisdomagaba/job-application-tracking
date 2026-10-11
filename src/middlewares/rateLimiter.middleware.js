import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
    windowMs: 15 *60 * 1000,
    max: 5, // 5 failed attemptes per window
    message: {
        success: false,
        message: 'Too Many login attemptes. Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

export const publicApiLimiter = rateLimit({
    windowMs: 10 *60 *1000, //10 minutes
    max: 100, //100 requests per 10 minutes
    message: {
        success: false,
        message: 'Too many request. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});