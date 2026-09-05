// Sentry initialization - carregado com: node --import ./instrument.js server.js

if (process.env.SENTRY_DSN) {
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      environment: process.env.NODE_ENV,
    });
  } catch {
    console.warn('Sentry not available');
  }
}
