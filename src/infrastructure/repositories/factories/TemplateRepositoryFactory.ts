import config from '../../../config';
import { ITemplateRepository } from '../../../application/interfaces/repositories/ITemplateRepository';
import { MongoTemplateRepository } from '../mongodb/MongoTemplateRepository';
import { PostgresTemplateRepository } from '../postgres/PostgresTemplateRepository';
import { MySQLTemplateRepository } from '../mysql/MySQLTemplateRepository';

export class TemplateRepositoryFactory {
    static create(): ITemplateRepository {
        const dbType = config.dbType || 'mongodb';
        switch (dbType) {
            case 'postgres': return new PostgresTemplateRepository();
            case 'mysql': return new MySQLTemplateRepository();
            case 'mongodb':
            default: return new MongoTemplateRepository();
        }
    }
}
