import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';
import IUserContext from '../../core/domains/interface/userContext';
import _Error, { handleServiceError } from '../../utils/error';
import { IDataObject } from '../../core/domains/interface/types';

export class GetUsedChannelsV2UseCase {
    async execute(userContext: IUserContext, ids: string[]): Promise<any> {
        try {
            const appRepository = AppRepositoryFactory.create();

            const apps = await appRepository.findByChannelIds(ids, userContext.org_id);

            const mapOfChannelAndUsedState: {
                [key: string]: {
                    object_type: 'app';
                    is_used: boolean;
                    id: string;
                    settings: IDataObject;
                    product_id?: string;
                };
            } = {};

            const checkedIDs: string[] = [];

            apps.forEach((app: any) => {
                if (app?.channel?.id && ids.indexOf(app?.channel?.id) !== -1) {
                    if (checkedIDs.indexOf(app.channel.id) === -1) {
                        checkedIDs.push(app.channel.id);
                        mapOfChannelAndUsedState[app.channel.id] = {
                            object_type: 'app',
                            is_used: true,
                            product_id: app.product_id as string,
                            id: app.id,
                            settings: {
                                options: app.options,
                                credentials: app.credentials,
                                user_progress: app.user_progress,
                                channel: app.channel,
                            },
                        };
                    }
                }
            });

            ids.forEach((id) => {
                if (!mapOfChannelAndUsedState[id]) {
                    mapOfChannelAndUsedState[id] = {
                        object_type: 'app',
                        is_used: false,
                        id: '',
                        settings: {},
                    };
                }
            });

            return { ...mapOfChannelAndUsedState };
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
