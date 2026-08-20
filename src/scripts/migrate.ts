import logger from '../server/logging/logger';
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator';
import { migrate as migrateMysql } from 'drizzle-orm/mysql2/migrator';
import { getPgDb, getPgClient, getMysqlDb, getMysqlPool } from '../infrastructure/database/drizzle';
import config from '../config';
import postgres from 'postgres';

async function ensureDatabase(): Promise<void> {
    const { host, port, user, password, database } = config.postgres;
    const admin = postgres({
        host, port, user, password,
        database: 'postgres',
        max: 1,
        prepare: false,
        ssl: process.env.POSTGRES_SSL === 'true' ? 'require' : false,
    });
    try {
        const rows = await admin`SELECT 1 FROM pg_database WHERE datname = ${database}`;
        if (rows.length === 0) {
            await admin.unsafe(`CREATE DATABASE "${database}"`);
            logger.info(`[migrate] created database "${database}"`);
        }
    } finally {
        await admin.end();
    }
}

async function runMigrate() {
    const dbType = config.dbType;

    if (dbType === 'postgres') {
        await ensureDatabase();
        logger.info('Running PostgreSQL migrations...');
        const db = getPgDb();
        await migratePg(db, { migrationsFolder: './drizzle/migrations/postgres' });
        await getPgClient().end();
    } else if (dbType === 'mysql') {
        logger.info('Running MySQL migrations...');
        const db = getMysqlDb();
        await migrateMysql(db, { migrationsFolder: './drizzle/migrations/mysql' });
        await getMysqlPool().end();
    } else {
        logger.info('MongoDB selected or no DB_TYPE set. Skipping migrations.');
    }

    logger.info('Migration process finished.');
    process.exit(0);
}

runMigrate().catch((err) => {
    logger.error('Migration failed:', err);
    process.exit(1);
});
