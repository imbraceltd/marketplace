import config from '../../../config';
import { IMarketplaceTemplateRepository } from '../../../application/interfaces/repositories/IMarketplaceTemplateRepository';
import { PostgresMarketplaceTemplateRepository } from '../postgres/PostgresMarketplaceTemplateRepository';

export class MarketplaceTemplateRepositoryFactory {
    static create(): IMarketplaceTemplateRepository {
        const dbType = config.dbType;
        if (dbType === 'postgres') {
            return new PostgresMarketplaceTemplateRepository();
        }
        throw new Error(
            `MarketplaceTemplateRepository is only implemented for Postgres (got: ${dbType ?? 'mongodb'})`,
        );
    }
}
