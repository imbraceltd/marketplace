import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';
import IUserContext from '../../core/domains/interface/userContext';
import _Error, { handleServiceError } from '../../utils/error';

export class GetRequiredCredentialsUseCase {
    async execute(userContext: IUserContext, appId: string): Promise<any> {
        try {
            if (!appId || appId === '') {
                throw new _Error('App ID is required', 400);
            }

            const repository = AppRepositoryFactory.create();
            const app = await repository.findById(appId);

            if (!app) {
                throw new _Error('App not found', 400);
            }

            if (app.organization_id !== userContext.org_id) {
                throw new _Error('App not found', 400);
            }

            return [];
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
