import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';
import IUserContext from '../../core/domains/interface/userContext';
import _Error, { handleServiceError } from '../../utils/error';
import { IDataObject } from '../../core/domains/interface/types';

export class GetUsedChannelsUseCase {
    async execute(userContext: IUserContext, ids: string[], productId?: string): Promise<any> {
        if (!ids || ids.length === 0) {
            throw new _Error('Ids are required', 400);
        }
        try {
            const repository = AppRepositoryFactory.create();
            const apps = await repository.findByChannelIds(ids, userContext.org_id);

            // Filter by productId if provided
            const filteredApps = productId
                ? apps.filter((app: any) => app.product_id === productId)
                : apps;

            const mapOfChannelAndUsedState: {
                [key: string]: {
                    app_id: string;
                    product_id?: string;
                    app_settings: IDataObject;
                };
            } = {};

            ids.forEach((id) => {
                const app = filteredApps.find((app: any) => app.channel?.id === id);
                if (!app) {
                    mapOfChannelAndUsedState[id] = {
                        app_id: '',
                        app_settings: {},
                    };
                    return;
                }

                mapOfChannelAndUsedState[id] = {
                    app_id: app.id,
                    product_id: app.product_id as string,
                    app_settings: {
                        options: app.options,
                        credentials: app.credentials,
                        user_progress: app.user_progress,
                        channel: app.channel,
                    },
                };
            });

            return { ...mapOfChannelAndUsedState };
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
