import config from '../../../config';
import { IEmailSenderRepository } from '../../../application/interfaces/repositories/IEmailSenderRepository';
import { MongoEmailSenderRepository } from '../mongodb/MongoEmailSenderRepository';
import { PostgresEmailSenderRepository } from '../postgres/PostgresEmailSenderRepository';
import { MySQLEmailSenderRepository } from '../mysql/MySQLEmailSenderRepository';

export class EmailSenderRepositoryFactory {
    static create(): IEmailSenderRepository {
        const dbType = config.dbType || 'mongodb';
        switch (dbType) {
            case 'postgres': return new PostgresEmailSenderRepository();
            case 'mysql': return new MySQLEmailSenderRepository();
            case 'mongodb':
            default: return new MongoEmailSenderRepository();
        }
    }
}
