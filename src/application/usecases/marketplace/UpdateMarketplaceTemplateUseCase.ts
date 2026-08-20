import { MarketplaceTemplateRepositoryFactory } from '../../../infrastructure/repositories/factories/MarketplaceTemplateRepositoryFactory';
import _Error from '../../../utils/error';

const TOP_LEVEL_FIELDS = ['name', 'description', 'type', 'active'] as const;

export class UpdateMarketplaceTemplateUseCase {
    private repository = MarketplaceTemplateRepositoryFactory.create();

    constructor() {}

    async execute(id: string, payload: Record<string, unknown>) {
        if (!id) throw new _Error('id is required', 400);

        const existing = await this.repository.findById(id);
        if (!existing) throw new _Error('Marketplace template not found', 404);

        const patch: Record<string, unknown> = {};
        for (const key of TOP_LEVEL_FIELDS) {
            if (payload[key] !== undefined) patch[key] = payload[key];
        }

        // Merge metadata: shallow merge of incoming `metadata` object into existing.
        if (payload.metadata && typeof payload.metadata === 'object') {
            patch.metadata = {
                ...(existing.metadata ?? {}),
                ...(payload.metadata as Record<string, unknown>),
            };
        }

        if (Object.keys(patch).length === 0) {
            return existing;
        }

        const updated = await this.repository.update(id, patch);
        return updated;
    }
}
