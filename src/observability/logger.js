import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

export const requestIdStorage = new AsyncLocalStorage();

// pino-pretty via transport (worker_threads/thread-stream) crasha no Node
// 20.6+/22+/24 com essa versão do thread-stream ("this should not happen:
// undefined"). Roda no processo principal em vez de worker — mesmo
// resultado visual em dev, sem depender do thread-stream.
export const logger = process.env.NODE_ENV === 'production'
  ? pino({ level: 'info' })
  : pino(
      { level: 'debug' },
      (await import('pino-pretty')).default({
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      })
    );

console.log = logger.info.bind(logger);
console.error = logger.error.bind(logger);
console.warn = logger.warn.bind(logger);
console.debug = logger.debug.bind(logger);

export const getRequestId = () => requestIdStorage.getStore() || 'no-request-id';

export const withRequestId = (requestId, callback) => {
  return requestIdStorage.run(requestId, callback);
};
