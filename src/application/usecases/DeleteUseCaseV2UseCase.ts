import logger from '../../server/logging/logger';
import { UseCaseRepositoryFactory } from '../../infrastructure/repositories/factories/UseCaseRepositoryFactory';
import { removeAgentChannelV2 } from '../../core/repositories/channel.repository';
import { deleteAssistant } from '../../core/repositories/ai.repository';
import { unlinkAssistantFromAllSchemas } from '../../core/repositories/dataBoard.repository';

export class DeleteUseCaseV2UseCase {
    private repository = UseCaseRepositoryFactory.create();

    constructor() { }

    async execute(id: string, orgId: string) {
        if (!id || !orgId) {
            const error: any = new Error('Use cases not found');
            error.code = 400;
            throw error;
        }

        const existing = await this.repository.findById(id);
        if (!existing) {
            const error: any = new Error(`UseCase with id ${id} doesn't exist`);
            error.code = 404;
            throw error;
        }

        const existingData = existing.toJSON ? existing.toJSON() : existing;

        // Delete channel (v2 — swallow channel errors like v1 service)
        if (existingData.channel_id && existingData.type !== 'default') {
            try {
                await removeAgentChannelV2(orgId, existingData.channel_id);
            } catch (err) {
                logger.error('Failed to delete agent channel v2, continuing:', err);
            }
        }

        // Delete AI assistant — swallow errors so a stale/missing assistant
        // (e.g. installed from template with original assistant_id that doesn't
        // exist in this org) does not block use-case deletion.
        if (existingData.assistant_id && existingData.type !== 'default') {
            try {
                await deleteAssistant(orgId, existingData.assistant_id);
            } catch (err) {
                logger.error('Failed to delete assistant, continuing:', err);
            }

            // Prune the now-deleted assistant from data-board doc-schemas so
            // its agent_ids don't dangle. Best-effort like the calls above.
            try {
                await unlinkAssistantFromAllSchemas(orgId, existingData.assistant_id);
            } catch (err) {
                console.error('Failed to unlink assistant from data-board schemas, continuing:', err);
            }
        }

        await this.repository.delete(id);
        return true;
    }
}
