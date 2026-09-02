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
import authRoutes from './src/routes/auth.js';
import apiRoutes from './src/routes/api.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', './src/views');

app.use(requestContextMiddleware);
app.use(compression());
app.use(helmets);
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
app.use(cspMiddleware);
app.use(attachCsrfToken);
app.use(disableAuthenticatedCache);

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

app.get('/precos', (req, res) => {
  res.render('precos', { title: 'Preços', userId: req.session?.userId });
});

app.get('/login', (req, res) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Entrar' });
});

app.get('/esqueci-senha', (req, res) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  res.render('esqueci-senha', { title: 'Esqueci minha senha' });
});

app.get('/resetar-senha', (req, res) => {
  if (req.session?.userId) {
    return res.redirect('/dashboard');
  }
  res.render('resetar-senha', { title: 'Redefinir senha', token: req.query.token || '' });
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

app.get('/lojas', (req, res) => {
  if (!req.session?.userId) {
    return res.redirect('/login');
  }
  res.render('lojas', { title: 'Lojas', userId: req.session.userId });
});

app.get('/insumos', (req, res) => {
  if (!req.session?.userId) {
    return res.redirect('/login');
  }
  res.render('insumos', { title: 'Insumos', userId: req.session.userId });
});

app.get('/compras', (req, res) => {
  if (!req.session?.userId) {
    return res.redirect('/login');
  }
  res.render('compras', { title: 'Compras', userId: req.session.userId });
});

app.get('/vendas', (req, res) => {
  if (!req.session?.userId) {
    return res.redirect('/login');
  }
  res.render('vendas', { title: 'Vendas', userId: req.session.userId });
});

// Auth routes (sem CSRF para login/signup públicos)
app.use('/auth', authRoutes);

// CSRF protection para rotas autenticadas
app.use(verifyCsrfToken);

// API routes
app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).render('404', { title: 'Não encontrado' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('500', { title: 'Erro interno' });
});

export default app;
