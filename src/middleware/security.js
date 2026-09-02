import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { logger } from '../observability/logger.js';

export const helmets = helmet({
  contentSecurityPolicy: false,
  referrerPolicy: { policy: 'same-origin' },
});

export const attachCspNonce = (req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  res.locals.safeJson = safeJson;
  next();
};

export const safeJson = (obj) => {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
};

export const cspMiddleware = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    scriptSrc: [(req, res) => `'nonce-${res.locals.cspNonce}'`, "'self'"],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:'],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    objectSrc: ["'none'"],
    ...(process.env.NODE_ENV === 'production' && { upgradeInsecureRequests: [] }),
  },
});

export const attachCsrfToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;

  // Double-submit: o cookie precisa existir para verifyCsrfToken comparar.
  if (req.cookies?.csrf_token !== req.session.csrfToken) {
    res.cookie('csrf_token', req.session.csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  next();
};

export const verifyCsrfToken = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (req.path.startsWith('/api/webhooks/')) {
    return next();
  }

  const tokenFromSession = req.session.csrfToken;
  const tokenFromBody = req.body?._csrf || req.headers['x-csrf-token'];
  const tokenFromCookie = req.cookies?.csrf_token;

  if (!tokenFromSession || !tokenFromBody || !tokenFromCookie) {
    logger.warn({ path: req.path, method: req.method }, 'CSRF token missing');
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  try {
    if (
      !crypto.timingSafeEqual(
        Buffer.from(tokenFromSession),
        Buffer.from(tokenFromBody)
      ) ||
      !crypto.timingSafeEqual(
        Buffer.from(tokenFromSession),
        Buffer.from(tokenFromCookie)
      )
    ) {
      logger.warn({ path: req.path }, 'CSRF token mismatch');
      return res.status(403).json({ error: 'CSRF token invalid' });
    }
  } catch (error) {
    logger.error({ error, path: req.path }, 'CSRF token comparison failed');
    return res.status(403).json({ error: 'CSRF token invalid' });
  }

  next();
};

export const disableAuthenticatedCache = (req, res, next) => {
  if (req.session?.userId) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  next();
};

export const globalLimiter =
  process.env.NODE_ENV === 'production'
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 1000,
        skip: (req) => req.path === '/livez',
        message: 'Too many requests, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
      })
    : (req, res, next) => next();

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  message: 'Too many login attempts, please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  message: 'Too many signup attempts, please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  message: 'Too many password reset attempts, please try again in 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

export const expensiveWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => {
    if (req.session?.contaId) {
      return `${req.session.contaId}:${req.ip}`;
    }
    return req.ip || req.connection.remoteAddress;
  },
  message: 'Request limit exceeded, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
