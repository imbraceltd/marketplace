import { IEmailTemplateRepository } from '../interfaces/repositories/IEmailTemplateRepository';
import _Error, { handleServiceError } from '../../utils/error';

export class UpdateEmailTemplateUseCase {
    constructor(private repository: IEmailTemplateRepository) { }

    async execute(userContext: any, id: string, data: any) {
        try {
            const organizationId = userContext.org_id;
            if (!organizationId) throw new _Error('Organization id is required', 401);

            const current = await this.repository.findById(id);
            if (!current || (organizationId && current.organization_id !== organizationId)) {
                throw new _Error('Email template not found', 404);
            }

            const { name, subject, body, category } = data;
            if (name === '') throw new _Error('Email name is required', 400);
            if (subject === '') throw new _Error('Email subject is required', 400);
            if (body === '') throw new _Error('Email body is required', 400);

            const updateData = {
                ...data,
                updated_at: new Date(),
            };

            // v1 logic: remove empty category
            if (category === '') {
                delete updateData.category;
            }

            return await this.repository.update(id, updateData);
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
