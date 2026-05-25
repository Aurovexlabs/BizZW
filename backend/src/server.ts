import 'dotenv/config';

import { captureException, initializeSentry } from './lib/sentry';

import app from './app';
import { startBackgroundJobs } from './lib/background-jobs';
import { connectMasterDB } from './lib/db';
import { logger } from './lib/logger';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
initializeSentry();

async function bootstrap() {
  try {
    await connectMasterDB();
    logger.info('Connected to master database');

    const server = app.listen(PORT, () => {
      startBackgroundJobs();
      logger.info(
        {
          port: PORT,
          environment: process.env.NODE_ENV ?? 'development',
        },
        'BizZW API started'
      );
    });

    server.on('error', (error) => {
      captureException(error, { phase: 'listen' });
      logger.fatal({ err: error, port: PORT }, 'Failed to bind API server');
      process.exit(1);
    });
  } catch (error) {
    captureException(error, { phase: 'bootstrap' });
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
