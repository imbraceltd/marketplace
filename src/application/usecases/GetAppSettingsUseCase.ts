import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';
import IUserContext from '../../core/domains/interface/userContext';
import _Error, { handleServiceError } from '../../utils/error';

export class GetAppSettingsUseCase {
    async execute(userContext: IUserContext, appId: string): Promise<any> {
        try {
            const { org_id } = userContext;
            if (!org_id || !appId) {
                throw new _Error('App not found', 400);
            }

            const repository = AppRepositoryFactory.create();
            const app = await repository.findById(appId);

            if (!app) {
                throw new _Error('App not found', 400);
            }

            if (app.organization_id !== org_id) {
                throw new _Error('App not found', 400);
            }

            return {
                options: app.options,
                credentials: app.credentials,
                user_progress: app.user_progress,
                channel: app.channel,
            };
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
