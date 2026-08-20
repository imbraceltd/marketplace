import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import config from '../../../config';

// Lazy initialization: only create connection when actually needed
let _pgClient: ReturnType<typeof postgres> | null = null;
let _pgDb: ReturnType<typeof drizzle> | null = null;

export const getPgClient = (): ReturnType<typeof postgres> => {
    if (!_pgClient) {
        if (!config.postgres.host || config.postgres.host.includes('undefined')) {
            throw new Error('[PostgreSQL] Connection is not configured. Please set POSTGRES_* env variables.');
        }
        // Pass individual options to avoid URL-parsing issues with special chars in passwords
        _pgClient = postgres({
            host: config.postgres.host,
            port: config.postgres.port,
            user: config.postgres.user,
            password: config.postgres.password,
            database: config.postgres.database,
            ssl: process.env.POSTGRES_SSL === 'true' ? 'require' : false,
        });
    }
    return _pgClient;
};

export const getPgDb = (): ReturnType<typeof drizzle> => {
    if (!_pgDb) {
        _pgDb = drizzle(getPgClient());
    }
    return _pgDb;
};

// Backward-compatible exports — accessing these will trigger lazy init
// Use getPgDb() / getPgClient() directly in repositories to avoid import-time crash
export { _pgClient as pgClient, _pgDb as pgDb };

