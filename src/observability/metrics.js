import { register, Counter, Histogram } from 'prom-client';

register.clear?.();

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const databaseQueriesTotal = new Counter({
  name: 'database_queries_total',
  help: 'Total database queries',
  labelNames: ['operation', 'table'],
});

export const databaseQueryDurationSeconds = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Database query latency',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5],
});

export const metricsEndpoint = (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
};
