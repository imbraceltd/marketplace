import logger from '../server/logging/logger';
import { execSync } from 'child_process';
import config from '../config';

async function generate() {
    const dbType = config.dbType;
    if (dbType === 'mongodb') {
        logger.info('MongoDB is schema-less. Skipping generation.');
        return;
    }

    logger.info(`Generating migrations for ${dbType}...`);
    try {
        execSync(`npx drizzle-kit generate`, { stdio: 'inherit' });
        logger.info('Generation completed successfully.');
    } catch (error) {
        logger.error('Error generating migrations:', error);
        process.exit(1);
    }
}

generate();
