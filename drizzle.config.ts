import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const dbType = process.env.DB_TYPE || 'postgres';

export default defineConfig({
    schema: './src/infrastructure/database/drizzle/schema.ts',
    out: `./drizzle/migrations/${dbType}`,
    dialect: dbType === 'mysql' ? 'mysql' : 'postgresql',
    dbCredentials: {
        host: dbType === 'mysql' ? (process.env.MYSQL_HOST || 'localhost') : (process.env.POSTGRES_HOST || 'localhost'),
        user: dbType === 'mysql' ? (process.env.MYSQL_USER || 'root') : (process.env.POSTGRES_USER || 'postgres'),
        password: dbType === 'mysql' ? (process.env.MYSQL_PASSWORD || 'root') : (process.env.POSTGRES_PASSWORD || 'postgres'),
        database: dbType === 'mysql' ? (process.env.MYSQL_DB || 'marketplaces') : (process.env.POSTGRES_DB || 'marketplaces'),
        port: parseInt(dbType === 'mysql' ? (process.env.MYSQL_PORT || '3306') : (process.env.POSTGRES_PORT || '5432')),
        ssl: false,
    },
    verbose: true,
    strict: true,
});
