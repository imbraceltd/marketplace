import config from '../../../config';
import { IFormRepository } from '../../../application/interfaces/repositories/IFormRepository';
import { MongoFormRepository } from '../mongodb/MongoFormRepository';
import { PostgresFormRepository } from '../postgres/PostgresFormRepository';
import { MySQLFormRepository } from '../mysql/MySQLFormRepository';

export class FormRepositoryFactory {
    static create(): IFormRepository {
        const dbType = config.dbType || 'mongodb';
        switch (dbType) {
            case 'postgres': return new PostgresFormRepository();
            case 'mysql': return new MySQLFormRepository();
            case 'mongodb':
            default: return new MongoFormRepository();
        }
    }
}
