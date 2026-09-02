import { randomUUID } from 'crypto';
import pinoHttp from 'pino-http';
import { requestIdStorage } from '../observability/logger.js';

export const requestContextMiddleware = pinoHttp({
  genReqId: (req) => {
    return req.headers['x-request-id'] || req.headers['cf-ray'] || randomUUID();
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
    if (res.statusCode >= 500 || err) return 'error';
    return 'info';
  },
  beforeHandler: (req) => {
    requestIdStorage.enterWith(req.id);
  },
});

export default requestContextMiddleware;
