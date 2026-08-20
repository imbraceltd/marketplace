import IUserContext from '../../core/domains/interface/userContext';
import { UseCaseRepositoryFactory } from '../../infrastructure/repositories/factories/UseCaseRepositoryFactory';
import _Error from '../../utils/error';

export class CreateUseCaseUseCase {
    private repository = UseCaseRepositoryFactory.create();

    constructor() { }

    async execute(userContext: IUserContext, payload: any) {
        if (!userContext || !userContext.org_id) {
            throw new _Error('missing user or orgId', 400);
        }
        if (!payload?.title) {
            throw new _Error('title is required', 400);
        }

        // Check duplicate title within the same organization (same as v1)
        const existing = await this.repository.findByOrganizationId(userContext.org_id, { search: payload.title });
        const duplicate = existing.find((u: any) => {
            const d = u.toJSON ? u.toJSON() : u;
            return d.title === payload.title;
        });
        if (duplicate) {
            throw new _Error(
                `UseCase with title ${payload.title} already exists in organization ${userContext.org_id}`,
                400,
            );
        }

        const data = {
            ...payload,
            user_id: userContext.user_id,
            organization_id: userContext.org_id,
        };

        const result = await this.repository.create(data);
        return result;
    }
}
