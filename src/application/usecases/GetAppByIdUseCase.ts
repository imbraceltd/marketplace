import { IAppRepository } from '../interfaces/repositories/IAppRepository';
import IUserContext from '../../core/domains/interface/userContext';
import _Error, { handleServiceError } from '../../utils/error';

export class GetAppByIdUseCase {
    constructor(private repository: IAppRepository) { }

    async execute(userContext: IUserContext, id: string): Promise<any> {
        try {
            const { org_id } = userContext;
            const appModel = await this.repository.findById(id);
            if (!appModel) {
                throw new _Error('App not found', 400);
            }

            const app = typeof appModel.toJSON === 'function' ? appModel.toJSON() : appModel;

            // Check if App belongs to the organization
            if (app.organization_id !== org_id) {
                throw new _Error('App not found', 400);
            }

            return {
                ...app,
                data_board: {},
                webhook_id: '',
            };
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
