import { UseCaseRepositoryFactory } from '../../infrastructure/repositories/factories/UseCaseRepositoryFactory';
import _Error from '../../utils/error';

export class GetUseCaseByAssistantIdUseCase {
    private repository = UseCaseRepositoryFactory.create();

    constructor() { }

    async execute(assistantId: string, orgId: string) {
        if (!assistantId || !orgId) {
            throw new _Error('Use cases not found', 400);
        }

        const useCases = await this.repository.findByAssistantIds([assistantId]);
        const useCase = useCases.find((uc: any) => uc.organization_id === orgId);
        if (!useCase) {
            throw new _Error('UseCase not found', 404);
        }

        return useCase;
    }
}
