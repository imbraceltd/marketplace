import { IFormRepository } from '../interfaces/repositories/IFormRepository';
import IUserContext from '../../core/domains/interface/userContext';
import _Error, { handleServiceError } from '../../utils/error';

export class GetFormByIdUseCase {
    constructor(private formRepository: IFormRepository) { }

    async execute(userContext: IUserContext, formId: string): Promise<any> {
        try {
            const { org_id } = userContext;
            if (!org_id) {
                throw new _Error('Unauthorized', 401);
            }

            const form = await this.formRepository.findById(formId);

            if (!form) {
                throw new _Error('Form not found', 404);
            }

            // use toJSON to match V1 format (includes _id, filters is_system fields, and includes map_to_contact)
            return form.toJSON({ includeMapToContact: true });
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
