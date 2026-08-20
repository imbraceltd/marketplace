import { IEmailTemplateRepository } from '../interfaces/repositories/IEmailTemplateRepository';
import _Error, { handleServiceError } from '../../utils/error';

export class CreateEmailTemplateUseCase {
    constructor(private repository: IEmailTemplateRepository) { }

    async execute(userContext: any, data: any) {
        try {
            const organizationId = userContext.org_id;
            if (!organizationId) throw new _Error('Organization id is required', 401);

            const { name, subject, body, category } = data;
            if (!name) throw new _Error('Email name is required', 400);
            if (!subject) throw new _Error('Email subject is required', 400);
            if (!body) throw new _Error('Email body is required', 400);

            const templateData = {
                ...data,
                organization_id: organizationId,
            };

            // v1 logic: remove empty category
            if (category === '') {
                delete templateData.category;
            }

            return await this.repository.create(templateData);
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
