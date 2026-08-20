import { IEmailTemplateRepository } from '../interfaces/repositories/IEmailTemplateRepository';
import _Error, { handleServiceError } from '../../utils/error';

export class DeleteEmailTemplateUseCase {
    constructor(private repository: IEmailTemplateRepository) { }

    async execute(userContext: any, id: string) {
        try {
            const organizationId = userContext.org_id;
            if (!organizationId) throw new _Error('Organization id is required', 401);

            const current = await this.repository.findById(id);
            if (!current || (organizationId && current.organization_id !== organizationId)) {
                throw new _Error('Email template not found', 404);
            }

            return await this.repository.delete(id);
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
