import { UseCaseRepositoryFactory } from '../../infrastructure/repositories/factories/UseCaseRepositoryFactory';

export class GetUseCaseByIdUseCase {
    private repository = UseCaseRepositoryFactory.create();

    constructor() { }

    async execute(id: string, orgId: string) {
        if (!id || !orgId) {
            const error: any = new Error('Use cases not found');
            error.code = 400;
            throw error;
        }

        const useCase = await this.repository.findById(id);
        if (!useCase) {
            const error: any = new Error('UseCase not found');
            error.code = 404;
            throw error;
        }

        return useCase;
    }
}
