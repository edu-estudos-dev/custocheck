import { randomUUID } from 'crypto';
import pinoHttp from 'pino-http';
import { logger, requestIdStorage } from '../observability/logger.js';

const STATIC_ASSET = /\.(css|js|svg|png|jpg|jpeg|ico|woff2?|map)$/;

const pinoHttpMiddleware = pinoHttp({
  logger,
  genReqId: (req) => {
    return req.headers['x-request-id'] || req.headers['cf-ray'] || randomUUID();
  },
  // CSS/JS/imagem lota o terminal sem agregar nada em dev — só loga
  // navegação de página, chamadas de API e qualquer coisa que não seja
  // sucesso (autoLogging.ignore só entra quando a resposta já deu certo).
  autoLogging: {
    ignore: (req) => STATIC_ASSET.test(req.url),
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
    if (res.statusCode >= 500 || err) return 'error';
    return 'info';
  },
  // Sem isso, cada linha loga headers e cookies inteiros (incluindo
  // connect.sid e csrf_token em texto puro) — poluí o terminal e vaza
  // sessão/token pro log à toa.
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

// pino-http v8 não tem a opção "beforeHandler" (era de uma versão antiga) —
// ela era ignorada silenciosamente e o ID de correlação nunca entrava no
// AsyncLocalStorage. Envolve o middleware pra rodar o resto da request
// dentro do contexto certo.
export const requestContextMiddleware = (req, res, next) => {
  pinoHttpMiddleware(req, res, () => {
    requestIdStorage.run(req.id, next);
  });
};

export default requestContextMiddleware;
