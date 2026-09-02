import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import methodOverride from 'method-override';
import session from 'express-session';
import RedisStore from 'connect-redis';
import redis from 'redis';
import { requestContextMiddleware } from './src/middleware/requestContext.js';
import {
  helmets,
  cspMiddleware,
  attachCspNonce,
  attachCsrfToken,
  verifyCsrfToken,
  disableAuthenticatedCache,
  globalLimiter,
} from './src/middleware/security.js';
import { livez, readyz, healthz } from './src/observability/health.js';
import { metricsEndpoint } from './src/observability/metrics.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', './src/views');

app.use(requestContextMiddleware);
app.use(compression());
app.use(helmets);
app.use(cspMiddleware);
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride('_method'));

let sessionStore;
if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
  const redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.connect();
  sessionStore = new RedisStore({ client: redisClient });
} else {
  const { MemoryStore } = await import('express-session');
  sessionStore = new MemoryStore();
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be 32+ chars in production');
  }
  console.warn('⚠️  SESSION_SECRET weak or missing, using temporary secret');
}

app.use(
  session({
    store: sessionStore,
    secret: sessionSecret || 'temporary-dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

app.use(globalLimiter);
app.use(attachCspNonce);
app.use(attachCsrfToken);
app.use(disableAuthenticatedCache);
app.use(verifyCsrfToken);

app.use(express.static('public'));

app.get('/livez', livez);
app.get('/readyz', readyz);
app.get('/healthz', healthz);
app.get('/metrics', metricsEndpoint);

app.get('/', (req, res) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  res.render('index', { title: 'CustoCheck' });
});

app.get('/login', (req, res) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Entrar' });
});

app.get('/register', (req, res) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  res.render('register', { title: 'Criar Conta' });
});

app.get('/dashboard', (req, res) => {
  if (!req.session?.userId) {
    return res.redirect('/login');
  }
  res.render('dashboard', { title: 'Dashboard', userId: req.session.userId });
});

app.use((req, res) => {
  res.status(404).render('404', { title: 'Não encontrado' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('500', { title: 'Erro interno' });
});

export default app;
