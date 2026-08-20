import config from '../../../config';
import { IAppRepository } from '../../../application/interfaces/repositories/IAppRepository';
import { MongoAppRepository } from '../mongodb/MongoAppRepository';
import { PostgresAppRepository } from '../postgres/PostgresAppRepository';
import { MySQLAppRepository } from '../mysql/MySQLAppRepository';

export class AppRepositoryFactory {
    static create(): IAppRepository {
        const dbType = config.dbType || 'mongodb';

        switch (dbType) {
            case 'postgres':
                return new PostgresAppRepository();
            case 'mysql':
                return new MySQLAppRepository();
            case 'mongodb':
            default:
                return new MongoAppRepository();
        }
    }
}
