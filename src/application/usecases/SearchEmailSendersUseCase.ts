import { IEmailSenderRepository } from '../interfaces/repositories/IEmailSenderRepository';
import { IAppRepository } from '../interfaces/repositories/IAppRepository';
import { getAllOrgMembers } from '../../core/repositories/team_users';
import _Error, { handleServiceError } from '../../utils/error';

export class SearchEmailSendersUseCase {
    constructor(
        private repository: IEmailSenderRepository,
        private appRepository: IAppRepository
    ) { }

    async execute(userContext: any, query: any) {
        try {
            const organizationId = userContext.org_id;
            if (!organizationId) throw new _Error('Organization id is required', 401);

            // 1. Sync if needed
            const countWithoutUserId = await this.repository.countWithoutUserId(organizationId);
            if (countWithoutUserId > 0) {
                await this.syncEmailSenderWithOrgUsers(userContext);
            }

            // 2. Fetch senders
            const emailSenders = await this.repository.findByOrganizationId(organizationId, query);

            // 3. Fetch apps to check in_use
            const apps = await this.appRepository.findByOrganizationId(organizationId);
            const emailSenderApps = apps.filter((app: any) => app.channel?.channel_type === 'email_sender');

            // 4. Map results
            return emailSenders.map((sender: any) => {
                const app = emailSenderApps.find((a: any) => a.channel?.id === sender.id);
                return {
                    ...sender.toJSON(),
                    in_use: !!app,
                    app_id: app ? app.id : undefined,
                    user_progress: app ? app.user_progress : undefined,
                };
            });
        } catch (error) {
            throw handleServiceError(error);
        }
    }

    private async syncEmailSenderWithOrgUsers(userContext: any) {
        const organizationId = userContext.org_id;
        const users = await getAllOrgMembers(organizationId);
        const emailSenders = await this.repository.findByOrganizationId(organizationId);

        for (const sender of emailSenders) {
            if (sender.user_id) continue;
            const user = users.find((u: any) => u.email === sender.email);

            if (!user) {
                // Soft delete or just skip? v1 does soft delete: findOneAndUpdate with deleted_at
                await this.repository.update(sender.id, { deleted_at: new Date() });
            } else {
                await this.repository.update(sender.id, { user_id: user._id });
            }
        }
    }
}
