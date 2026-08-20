import { IFormRepository } from '../interfaces/repositories/IFormRepository';
import _Error, { handleServiceError } from '../../utils/error';

export class GetPublicFormUseCase {
    constructor(private repository: IFormRepository) { }

    async execute(id: string) {
        try {
            const form = await this.repository.findById(id);
            if (!form || !form.is_active) {
                throw new _Error('Form not found', 404);
            }

            const data = form.toJSON({ includeMapToContact: false });

            // Final V1 pruning for public view
            delete data.map_to_contact;
            delete data.engagement_count;
            delete data.owner;
            delete data.teams;
            delete data.doc_name;
            delete data.board_name;
            delete data.submitted_count;
            delete data.public_id;
            delete data.created_at;
            delete data.updated_at;

            // Deep field filtering: remove is_identifier, is_unique_identifier as per V1
            if (data.fields && Array.isArray(data.fields)) {
                data.fields = data.fields.map((field: any) => {
                    const cleanField = { ...field };
                    delete cleanField.is_identifier;
                    delete cleanField.is_unique_identifier;
                    delete cleanField.is_system; // Already filtered in toJSON but safe to ensure
                    return cleanField;
                });
            }

            return data;
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
