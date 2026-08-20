import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';
import _Error, { handleServiceError } from '../../utils/error';

export class GetAppSettingsByWorkflowIdUseCase {
    async execute(workflowId: string): Promise<any> {
        try {
            if (!workflowId) {
                throw new _Error('App not found', 400);
            }

            const repository = AppRepositoryFactory.create();
            const app = await repository.findByWorkflowId(workflowId);

            if (!app) {
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
