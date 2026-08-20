import { IAppRepository } from '../interfaces/repositories/IAppRepository';
import IUserContext from '../../core/domains/interface/userContext';
import { IDataObject } from '../../core/domains/interface/types';
import { AppType, IApp } from '../../core/domains/interface/app';
import { testIfChannelOkV3, IStoredChannel } from '../../core/services/channel.service';
import { getBoards } from '../../core/repositories/boards.repository';
import _Error, { handleServiceError } from '../../utils/error';

export class GetAppsUseCase {
    constructor(private repository: IAppRepository) { }

    async execute(userContext: IUserContext, query?: IDataObject): Promise<any[]> {
        const { org_id } = userContext;
        const {
            include_hidden = false,
            include_checking = true,
            search,
            ...restOfQuery
        } = query || {};

        try {
            // 1. Get apps from repository
            let apps: any[];
            apps = await this.repository.findByOrganizationId(org_id);

            // Simple hidden filtering if not handled by repository
            if (!include_hidden) {
                apps = apps.filter(app => !app.is_hidden);
            }

            if (!include_checking) {
                return apps.map(app => (typeof app.toJSON === 'function' ? app.toJSON() : app));
            }

            // 2. Channel checking
            const isChannelOkPromises = apps.map((app) => {
                if (app.channel && app.channel.id) {
                    return testIfChannelOkV3(userContext, app.channel as IStoredChannel);
                }
                return Promise.resolve(null);
            });

            const channelsStatuses = (await Promise.allSettled(isChannelOkPromises)).map(
                (result) => (result.status === 'fulfilled' ? result.value : null)
            );

            // 3. Enrich apps with error status
            for (let i = 0; i < apps.length; i++) {
                const app = apps[i];
                if (app.app_type === AppType.CustomizationApp) continue;
                if (!app.channel || !app.channel.id) continue;

                if (app.channel?.id && !channelsStatuses[i]?.ok) {
                    app.error = channelsStatuses[i]?.error_code;
                }

                if (app.error) {
                    app.is_active = false;
                }
            }

            const activeApps: any[] = [];
            const deactivatedApps: any[] = [];
            const inprogressApps: any[] = [];
            const errorApps: any[] = [];

            apps.forEach((appModel) => {
                const app = typeof appModel.toJSON === 'function' ? appModel.toJSON() : appModel;

                // Categorize
                if (app.error) {
                    errorApps.push(app);
                } else if (app.user_progress && app.user_progress.finished === false) {
                    inprogressApps.push(app);
                } else if (app.is_active) {
                    activeApps.push(app);
                } else {
                    deactivatedApps.push(app);
                }
            });

            return [...activeApps, ...deactivatedApps, ...inprogressApps, ...errorApps];

        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
