import logger from './server/logging/logger';
import express from 'express';
import v1Handlers from './server/routers';
import proxyHandler from './server/routers/proxyRouter';
import { requestContext } from './server/middleware/request-context';
import { accessLogger } from './server/middleware/access-logger';
import { installCorrelation } from './server/http/client';
import config from './config';
import { connect as connectMongoDB } from './db/mongodb';
import webhookRouter from './server/routers/webhook';
// import kafka from './kafka';
import migrate from './db/migrate';
import v3ApiRouter from './server/routers/v3';
import { parseUserContext } from './server/middleware/authorize.middleware';
import { seedBuiltinAgents } from './core/services/builtin_agent_seed.service';
import postgres from 'postgres';
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator';
import { getPgDb, getPgClient } from './infrastructure/database/drizzle';

const startServer = async () => {
  try {
    // Propagate x-request-id / x-proxy on every outbound axios call.
    installCorrelation();

    const app = express();

    // Request correlation — FIRST, so every request (incl. the /v2 proxy) gets
    // an x-request-id, forwards it downstream, and has an ALS context for logs.
    app.use(requestContext);

    // Proxy
    app.use('/v2', proxyHandler);

    app.disable('etag');

    if (config.hasMongoConfig) {
      // Connect to MongoDB
      logger.info('Connecting to MongoDB...');
      await connectMongoDB();
      logger.info('MongoDB connected successfully');

      // Migrate
      await migrate.run();
    } else {
      logger.info('Skipping MongoDB connection. No MongoDB config found.');
    }

    // Auto-create DB and run Drizzle migrations when using PostgreSQL.
    if (config.dbType === 'postgres') {
      const { host, port, user, password, database } = config.postgres;
      const admin = postgres({ host, port, user, password, database: 'postgres', max: 1, prepare: false, ssl: process.env.POSTGRES_SSL === 'true' ? 'require' : false });
      try {
        const rows = await admin`SELECT 1 FROM pg_database WHERE datname = ${database}`;
        if (rows.length === 0) {
          await admin.unsafe(`CREATE DATABASE "${database}"`);
          logger.info(`[startup] created database "${database}"`);
        }
      } finally {
        await admin.end();
      }
      await migratePg(getPgDb(), { migrationsFolder: './drizzle/migrations/postgres' });
      logger.info('[startup] PostgreSQL migrations applied');
    }

    // Seed built-in agents from JSON files into openai_assistant_builtin_agent.
    // Reason: built-in template list is served from DB (not a TS constant),
    // so this must run before HTTP traffic is accepted.
    await seedBuiltinAgents();

    // JSON parser
    app.use(
      express.json({
        limit: '50mb',
      }),
    );

    // multipart/form-data parser
    app.use(express.text({ type: '/' }));

    // URL Encoded parser
    app.use(express.urlencoded({ extended: false }));

    // GLOBAL MIDDLEWARES — structured access log (replaces morgan).
    app.use(accessLogger);

    app.get('/', (req, res) => {
      // api to get version
      res.json({
        name: 'Marketplace APIs',
        version: config.version,
        env: config.environment,
      });
    });

    // HANDLERS: version 1 (MongoDB)
    if (config.hasMongoConfig) {
      logger.info('Mounting /v1 routes (MongoDB)...');
      app.use('/v1', v1Handlers);
      app.use('/v1/webhooks', webhookRouter);

      // /v2/email-templates/... — same controllers as v1 but without /market-places prefix
      // The proxyHandler on /v2 handles /v2/submissions/* and falls through for everything else
      app.use('/v2', v1Handlers);
    }

    // HANDLERS: version 3 (PostgreSQL)
    if (config.dbType) {
      logger.info(`Mounting /v3 routes... (DB_TYPE: ${config.dbType})`);
      app.use('/v3', parseUserContext, v3ApiRouter);

      // When running without MongoDB, serve V3 (PostgreSQL) at /v1 as a drop-in replacement
      if (!config.hasMongoConfig) {
        logger.info(
          'No MongoDB config — mounting V3 (PostgreSQL) at /v1 and /v2',
        );
        app.use('/v1', parseUserContext, v3ApiRouter);
        // /v2/email-templates/... routes — proxyHandler on /v2 handles /submissions/* and falls through
        app.use('/v2', parseUserContext, v3ApiRouter);
      }
    }

    // START SERVER
    const port = Number(process.env.PORT ?? 9982);
    app.listen(port, '0.0.0.0', () => {
      logger.info(`Server running at http://localhost:${port}`);
    });

    // Connect to Kafka
    // await kafka.init();
  } catch (error) {
    logger.info('Error connecting to MongoDB: ', error);
  }
};

startServer();
