import { IAppRepository } from '../interfaces/repositories/IAppRepository';
import IUserContext from '../../core/domains/interface/userContext';
import { App } from '../../domain/entities/App';
import { AppType } from '../../core/domains/interface/app';
import { getPrefixId } from '../../db/models/utils';
import _Error, { handleServiceError } from '../../utils/error';

export class CreateAppUseCase {
    constructor(private repository: IAppRepository) { }

    async execute(userContext: IUserContext, appData: any): Promise<App> {
        try {
            if (!appData.title) {
                appData.title = 'Untitled App';
            }

            const { org_id, business_unit_id, user_id } = userContext;

            const newAppData = {
                ...appData,
                id: getPrefixId('app_'),
                organization_id: org_id,
                business_unit_id,
                user_id: user_id,
                created_by: user_id,
                updated_by: user_id,
                workflow_id: appData.workflow_id || '0',
                app_type: appData.app_type || AppType.CustomizationApp,
                categories: appData.categories || [],
                channels_or_platforms: appData.channels_or_platforms || [],
                created_from: appData.created_from || 'imbrace',
                updated_at: new Date(),
                created_at: new Date()
            };

            return await this.repository.create(newAppData);
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
