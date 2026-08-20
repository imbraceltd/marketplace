import {
    IMarketplaceTemplateRepository,
    ListOptions,
} from '../../interfaces/repositories/IMarketplaceTemplateRepository';
import { MarketplaceTemplateRepositoryFactory } from '../../../infrastructure/repositories/factories/MarketplaceTemplateRepositoryFactory';

export class ListMarketplaceTemplatesUseCase {
    private repository: IMarketplaceTemplateRepository;

    constructor(repository?: IMarketplaceTemplateRepository) {
        this.repository = repository ?? MarketplaceTemplateRepositoryFactory.create();
    }

    async execute(query: Record<string, string | undefined>) {
        const skip = query.skip ? parseInt(query.skip, 10) : 0;
        const limit = query.limit ? parseInt(query.limit, 10) : 0;
        const options: ListOptions = {
            search: query.name,
            skip,
            limit,
            organizationId: query.organization_id,
            activeOnly: query.active_only === 'true' || query.active_only === '1',
        };

        const [total, data] = await Promise.all([
            this.repository.countAll(options),
            this.repository.findAll(options),
        ]);

        return {
            data,
            total,
            skip,
            limit,
            has_more: skip + data.length < total,
        };
    }
}
