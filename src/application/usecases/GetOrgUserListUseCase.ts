import { EmailSenderRepositoryFactory } from '../../infrastructure/repositories/factories/EmailSenderRepositoryFactory';
import IUserContext from '../../core/domains/interface/userContext';
import { getAllOrgMembers } from '../../core/repositories/team_users';
import _Error, { handleServiceError } from '../../utils/error';

export class GetOrgUserListUseCase {
    async execute(userContext: IUserContext): Promise<any> {
        try {
            const users = await getAllOrgMembers(userContext.org_id);

            const emailSenderRepository = EmailSenderRepositoryFactory.create();
            const emailSenders = await emailSenderRepository.findByOrganizationId(userContext.org_id);

            // Filter out: remove users that are already email senders
            const filteredUsers = users.filter((user: any) => {
                return !emailSenders.find(
                    (emailSender: any) => emailSender.user_id === user._id
                );
            });

            // is_bot must be false
            return filteredUsers.filter((user: any) => !user.is_bot);
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
