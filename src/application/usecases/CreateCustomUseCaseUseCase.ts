import IUserContext from '../../core/domains/interface/userContext';
import { UseCaseRepositoryFactory } from '../../infrastructure/repositories/factories/UseCaseRepositoryFactory';
import { createAssistant } from '../../core/repositories/ai.repository';
import { createAgentChannel } from '../../core/repositories/channel.repository';

export class CreateCustomUseCaseUseCase {
    private repository = UseCaseRepositoryFactory.create();

    constructor() { }

    async execute(userContext: IUserContext, payload: any) {
        if (!userContext || !userContext.org_id) {
            throw new Error('missing usecase or assistant payload');
        }

        const { usecase, assistant } = payload;
        if (!usecase || !assistant) {
            throw new Error('missing usecase or assistant payload');
        }

        // Check duplicate title (same as v1)
        const existing = await this.repository.findByOrganizationId(userContext.org_id, { search: usecase?.title });
        const duplicate = existing.find((u: any) => {
            const d = u.toJSON ? u.toJSON() : u;
            return d.title === usecase?.title;
        });
        if (duplicate) {
            const error: any = new Error(`UseCase with title ${usecase?.title} already exists in organization ${userContext.org_id}`);
            error.code = 400;
            throw error;
        }

        // Create external resources (AI assistant + channel) — same as v1
        const createdAIAssistant = await createAssistant(userContext.org_id, assistant);
        if (!createdAIAssistant) {
            throw new Error('Failed to create AI assistant');
        }

        const createdAgentChannel = await createAgentChannel(userContext.org_id, usecase?.title, createdAIAssistant?.id ?? '');
        if (!createdAgentChannel) {
            throw new Error('Failed to create agent channel');
        }

        const data = {
            ...usecase,
            user_id: userContext.user_id,
            organization_id: userContext.org_id,
            assistant_id: createdAIAssistant?.id,
            channel_id: '',
            type: 'custom',
            demo_url: `${usecase.demo_url}?channel_id=${createdAgentChannel?.id}`,
        };

        const result = await this.repository.create(data);
        return result;
    }
}
