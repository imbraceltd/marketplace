import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';
import IUserContext from '../../core/domains/interface/userContext';
import _Error from '../../utils/error';
import { AppType } from '../../core/domains/interface/app';

export class DeactivateAppUseCase {
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

        if (app.app_type === AppType.CustomizationApp) {
            throw new _Error('Can not deactivate customized app', 400);
        }

        try {
            return await repository.update(appId, { is_active: false, updated_at: new Date() });
        } catch (error) {
            throw new _Error('Somethings went wrong', 500);
        }
    }
}
