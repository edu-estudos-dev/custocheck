import { logger } from '../observability/logger.js';

export const isAuthenticated = (req, res, next) => {
  if (!req.session?.userId) {
    logger.warn({ path: req.path }, 'Unauthenticated access attempt');
    return res.status(401).json({ error: 'Não autenticado' });
  }
  next();
};

export const hasRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!allowedRoles.includes(req.session.papel)) {
      logger.warn(
        { userId: req.session.userId, papel: req.session.papel },
        'Insufficient role'
      );
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const isPublic = (req, res, next) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  next();
};
