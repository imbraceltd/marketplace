import { IFormRepository } from '../interfaces/repositories/IFormRepository';
import { handleServiceError } from '../../utils/error';

export class GetFormsByBoardIdUseCase {
    constructor(private repository: IFormRepository) { }

    async execute(organizationId: string, boardId: string) {
        try {
            if (!organizationId) throw new Error('Organization ID is required');
            if (!boardId) throw new Error('Board ID is required');

            const forms = await this.repository.findByBoardId(organizationId, boardId);

            // Match v1 service logic: return only name and _id (or id in v3)
            return forms.map(f => ({
                name: f.name,
                _id: f.id
            }));
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
