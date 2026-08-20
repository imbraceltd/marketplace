import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import config from '../../../config';

// Lazy initialization: only create pool when actually needed
let _mysqlPool: mysql.Pool | null = null;
let _mysqlDb: ReturnType<typeof drizzle> | null = null;

export const getMysqlPool = (): mysql.Pool => {
    if (!_mysqlPool) {
        _mysqlPool = mysql.createPool({
            host: config.mysql.host,
            user: config.mysql.user,
            password: config.mysql.password,
            database: config.mysql.database,
            port: config.mysql.port,
        });
    }
    return _mysqlPool;
};

export const getMysqlDb = (): ReturnType<typeof drizzle> => {
    if (!_mysqlDb) {
        _mysqlDb = drizzle(getMysqlPool());
    }
    return _mysqlDb;
};

// Backward-compatible exports — null until first use
// Use getMysqlDb() / getMysqlPool() directly in repositories to avoid import-time crash
export { _mysqlPool as mysqlPool, _mysqlDb as mysqlDb };

