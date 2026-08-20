import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';
import IUserContext from '../../core/domains/interface/userContext';
import _Error, { handleServiceError } from '../../utils/error';

export class ActivateAppUseCase {
    async execute(userContext: IUserContext, appId: string): Promise<any> {
        const { org_id } = userContext;
        const repository = AppRepositoryFactory.create();

        const app = await repository.findById(appId);
        if (!app) {
            throw new _Error('App not found', 400);
        }

        if (app.organization_id !== org_id) {
            throw new _Error('App not found', 400);
        }

        try {
            return await repository.update(appId, { is_active: true, updated_at: new Date() });
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
