import { IAppRepository } from '../interfaces/repositories/IAppRepository';
import IUserContext from '../../core/domains/interface/userContext';
import { App } from '../../domain/entities/App';
import _Error, { handleServiceError } from '../../utils/error';

export class UpdateAppUseCase {
    constructor(private repository: IAppRepository) { }

    async execute(id: string, userContext: IUserContext, appData: any): Promise<App> {
        const { org_id } = userContext;
        const excludeFields = ['is_active'];

        const canUpdate: any = {};
        Object.keys(appData).forEach((key) => {
            if (excludeFields.indexOf(key) === -1) {
                canUpdate[key] = appData[key];
            }
        });

        const current = await this.repository.findById(id);
        if (!current) {
            throw new _Error('App not found', 400);
        }

        // Check if App belongs to the organization
        if (current.organization_id !== org_id) {
            throw new _Error('App not found', 400);
        }

        try {
            const updatePayload = {
                ...canUpdate,
                updated_at: new Date(),
            };

            const updatedApp = await this.repository.update(id, updatePayload);
            if (!updatedApp) {
                throw new _Error('App not found', 400);
            }
            return updatedApp;
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
