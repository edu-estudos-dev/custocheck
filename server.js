import app from './app.js';
import { logger } from './src/observability/logger.js';

const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || 'localhost';

const server = app.listen(PORT, HOSTNAME, () => {
  logger.info(`Server running at http://${HOSTNAME}:${PORT}`);
});

const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutdown initiated');

  server.close(async () => {
    logger.info('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Shutdown timeout exceeded');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
