import IUserContext from '../../core/domains/interface/userContext';
import { UseCaseRepositoryFactory } from '../../infrastructure/repositories/factories/UseCaseRepositoryFactory';
import { updateAssistant } from '../../core/repositories/ai.repository';
import { handleServiceError } from '../../utils/error';
import _Error from '../../utils/error';

export class UpdateCustomUseCaseUseCase {
    private repository = UseCaseRepositoryFactory.create();

    constructor() { }

    async execute(id: string, userContext: IUserContext, payload: any) {
        try {
            if (!id || !userContext || !userContext.org_id) {
                throw new _Error('Use cases not found', 400);
            }

            const { usecase, assistant } = payload;
            if (!usecase || !assistant) {
                throw new _Error('missing usecase or assistant payload', 400);
            }

            // Find existing use case from SQL
            const existing = await this.repository.findById(id);
            if (!existing) {
                throw new _Error(`UseCase with id ${id} doesn't exist`, 404);
            }

            const existingData = existing.toJSON ? existing.toJSON() : existing;

            if (existingData.organization_id !== userContext.org_id) {
                throw new _Error(`UseCase with id ${id} doesn't exist`, 404);
            }

            // Update AI assistant via external API (same as v1)
            const updatedAssistant = await updateAssistant(userContext.org_id, existingData.assistant_id ?? '', assistant);
            if (!updatedAssistant) {
                throw new _Error('Failed to update AI assistant', 500);
            }

            // Build update payload — only allowed fields (mirrors v1 updateFields logic)
            const updateData: any = { updated_at: new Date() };
            const allowedFields = [
                'short_description', 'description', 'title',
                'supported_channels', 'agent_type',
            ];
            for (const field of allowedFields) {
                if (usecase[field] !== undefined) updateData[field] = usecase[field];
            }

            const result = await this.repository.update(id, updateData);
            return result;
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
