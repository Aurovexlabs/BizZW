import { rateLimit } from 'express-rate-limit';

const isTestEnvironment = process.env.NODE_ENV === 'test';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    errorCode: 'RATE_LIMITED',
  },
  skip: () => isTestEnvironment,
  skipSuccessfulRequests: true,
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI request limit reached. Please wait before making more AI requests.',
    errorCode: 'AI_RATE_LIMITED',
  },
  skip: () => isTestEnvironment,
});

export const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Contact request limit reached. Please try again later.',
    errorCode: 'CONTACT_RATE_LIMITED',
  },
  skip: () => isTestEnvironment,
});
