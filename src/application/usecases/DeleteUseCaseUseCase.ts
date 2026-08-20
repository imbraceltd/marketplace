import logger from '../../server/logging/logger';
import { UseCaseRepositoryFactory } from '../../infrastructure/repositories/factories/UseCaseRepositoryFactory';
import { removeAgentChannel, removeAgentChannelV2 } from '../../core/repositories/channel.repository';
import { deleteAssistant } from '../../core/repositories/ai.repository';
import { unlinkAssistantFromAllSchemas } from '../../core/repositories/dataBoard.repository';
import _Error from '../../utils/error';

// Best-effort: prune a deleted assistant from data-board doc-schemas so its
// agent_ids don't dangle. Never throws — cleanup must not block deletion.
const unlinkAgentBestEffort = async (orgId: string, assistantId: string) => {
    try {
        await unlinkAssistantFromAllSchemas(orgId, assistantId);
    } catch (err) {
        console.error('Failed to unlink assistant from data-board schemas, continuing:', err);
    }
};

export class DeleteUseCaseUseCase {
    private repository = UseCaseRepositoryFactory.create();

    constructor() { }

    async execute(id: string, orgId: string) {
        if (!id || !orgId) {
            throw new _Error('id and orgId are required', 400);
        }

        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new _Error(`UseCase with id ${id} doesn't exist`, 404);
        }

        const existingData = existing.toJSON ? existing.toJSON() : existing;

        // If version > 1, use v2 delete logic (same as v1 service)
        if (existingData.version && existingData.version > 1) {
            if (existingData.channel_id && existingData.type !== 'default') {
                try {
                    await removeAgentChannelV2(orgId, existingData.channel_id);
                } catch (err) {
                    logger.error('Failed to delete agent channel v2, continuing:', err);
                }
            }
            if (existingData.assistant_id && existingData.type !== 'default') {
                await deleteAssistant(orgId, existingData.assistant_id);
                await unlinkAgentBestEffort(orgId, existingData.assistant_id);
            }
            await this.repository.delete(id);
            return true;
        }

        // v1 delete logic
        if (existingData.channel_id && existingData.type !== 'default') {
            await removeAgentChannel(orgId, existingData.channel_id);
        }
        if (existingData.assistant_id && existingData.type !== 'default') {
            await deleteAssistant(orgId, existingData.assistant_id);
            await unlinkAgentBestEffort(orgId, existingData.assistant_id);
        }

        await this.repository.delete(id);
        return true;
    }
}
