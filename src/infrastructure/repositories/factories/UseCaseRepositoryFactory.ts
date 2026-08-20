import config from '../../../config';
import { IUseCaseRepository } from '../../../application/interfaces/repositories/IUseCaseRepository';
import { MongoUseCaseRepository } from '../mongodb/MongoUseCaseRepository';
import { PostgresUseCaseRepository } from '../postgres/PostgresUseCaseRepository';
import { MySQLUseCaseRepository } from '../mysql/MySQLUseCaseRepository';

export class UseCaseRepositoryFactory {
    static create(): IUseCaseRepository {
        const dbType = config.dbType || 'mongodb';
        switch (dbType) {
            case 'postgres': return new PostgresUseCaseRepository();
            case 'mysql': return new MySQLUseCaseRepository();
            case 'mongodb':
            default: return new MongoUseCaseRepository();
        }
    }
}
