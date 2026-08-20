import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';
import IUserContext from '../../core/domains/interface/userContext';
import _Error, { handleServiceError } from '../../utils/error';
import { IAppCredentials } from '../../core/domains/interface/app';
import { IDataObject } from '../../core/domains/interface/types';

export class UpdateAppSettingsUseCase {
    async execute(
        userContext: IUserContext,
        appId: string,
        options: { [key: string]: string | number | boolean | IDataObject },
        credentials: IAppCredentials,
        user_progress: IDataObject,
        channel: { id: string; name: string; channel_type: string }
    ): Promise<any> {
        const { org_id } = userContext;
        const repository = AppRepositoryFactory.create();

        try {
            const app = await repository.findById(appId);
            if (!app) {
                throw new _Error('App not found', 400);
            }

            if (app.organization_id !== org_id) {
                throw new _Error('App not found', 400);
            }

            // Build update data
            const updateData: any = { updated_at: new Date() };
            if (options) updateData.options = options;
            if (credentials) updateData.credentials = credentials;
            if (user_progress) updateData.user_progress = user_progress;
            if (channel) updateData.channel = channel;

            const updated = await repository.update(appId, updateData);

            return {
                options: updated?.options || {},
                credentials: updated?.credentials || {},
                user_progress: updated?.user_progress || {},
                channel: channel || {},
            };
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
