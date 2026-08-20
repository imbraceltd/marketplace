import config from '../../../config';
import { IFileRepository } from '../../../application/interfaces/repositories/IFileRepository';
import { MongoFileRepository } from '../mongodb/MongoFileRepository';
import { PostgresFileRepository } from '../postgres/PostgresFileRepository';
import { MySQLFileRepository } from '../mysql/MySQLFileRepository';

export class FileRepositoryFactory {
    static create(): IFileRepository {
        const dbType = config.dbType || 'mongodb';
        switch (dbType) {
            case 'postgres': return new PostgresFileRepository();
            case 'mysql': return new MySQLFileRepository();
            case 'mongodb':
            default: return new MongoFileRepository();
        }
    }
}
