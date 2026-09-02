import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

export const requestIdStorage = new AsyncLocalStorage();

const pinoConfig = process.env.NODE_ENV === 'production'
  ? { level: 'info' }
  : {
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    };

export const logger = pino(pinoConfig);

console.log = logger.info.bind(logger);
console.error = logger.error.bind(logger);
console.warn = logger.warn.bind(logger);
console.debug = logger.debug.bind(logger);

export const getRequestId = () => requestIdStorage.getStore() || 'no-request-id';

export const withRequestId = (requestId, callback) => {
  return requestIdStorage.run(requestId, callback);
};
