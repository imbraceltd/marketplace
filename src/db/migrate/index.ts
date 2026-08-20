import logger from '../../server/logging/logger';
import emailIteration from './001_email_iteration';
import MigrateModel from './Migrate.model';

class Migrate {
  jobs: Map<string, (id: string) => Promise<void>>;

  constructor() {
    this.jobs = new Map();
  }

  addJob(id: string, job: (id: string) => Promise<void>) {
    this.jobs.set(id, job);
  }

  async run() {
    for (const [id, job] of this.jobs) {
      if (await MigrateModel.startMigration(id)) {
        try {
          logger.info(`Running migration: ${id}`);
          await job(id);
          await MigrateModel.setSuccess(id);
          logger.info(`Migration successful: ${id}`);
        } catch (e) {
          logger.error('Error When Run Migration: ', e);
          await MigrateModel.resetMigration(id);
        }
      }

      logger.info(`Migration already run: ${id}`);
    }
  }
}

const migrate = new Migrate();

migrate.addJob('001_email_iteration', emailIteration);

export default migrate;
