import config from '../../../config';
import { IEmailTemplateRepository } from '../../../application/interfaces/repositories/IEmailTemplateRepository';
import { MongoEmailTemplateRepository } from '../mongodb/MongoEmailTemplateRepository';
import { PostgresEmailTemplateRepository } from '../postgres/PostgresEmailTemplateRepository';
import { MySQLEmailTemplateRepository } from '../mysql/MySQLEmailTemplateRepository';

export class EmailTemplateRepositoryFactory {
    static create(): IEmailTemplateRepository {
        const dbType = config.dbType || 'mongodb';
        switch (dbType) {
            case 'postgres': return new PostgresEmailTemplateRepository();
            case 'mysql': return new MySQLEmailTemplateRepository();
            case 'mongodb':
            default: return new MongoEmailTemplateRepository();
        }
    }
}
