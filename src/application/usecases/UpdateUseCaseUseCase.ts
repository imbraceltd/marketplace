import { UseCaseRepositoryFactory } from '../../infrastructure/repositories/factories/UseCaseRepositoryFactory';
import _Error from '../../utils/error';

export class UpdateUseCaseUseCase {
    private repository = UseCaseRepositoryFactory.create();

    constructor() { }

    async execute(id: string, orgId: string, payload: any) {
        if (!id || !orgId) {
            throw new _Error('id and orgId are required', 400);
        }

        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new _Error('UseCase not found', 404);
        }

        const updateData: any = { updated_at: new Date() };
        const allowedFields = [
            'title', 'short_description', 'description', 'features',
            'thumbnail_url', 'hover_thumbnail_url', 'media', 'tags', 'video_url',
            'demo_url', 'demo_image_url', 'how_it_works', 'suggestion_prompts',
            'supported_channels', 'integrations', 'agent_type', 'active',
            'template', 'assistant_id', 'channel_id',
        ];
        for (const field of allowedFields) {
            if (payload[field] !== undefined) updateData[field] = payload[field];
        }

        const result = await this.repository.update(id, updateData);
        return result;
    }
}
