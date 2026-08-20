import { IFileRepository } from '../interfaces/repositories/IFileRepository';
import _Error from '../../utils/error';

export class GetFileByIdUseCase {
    constructor(private repository: IFileRepository) { }

    async execute(userContext: any, id: string) {
        if (!id) throw new _Error('File id is required', 400);
        const organizationId = userContext.org_id;
        if (!organizationId) throw new _Error('Organization id is required', 400);

        const file = await this.repository.findById(id);
        if (!file || file.organization_id !== organizationId) {
            throw new _Error('File not found', 404);
        }

        return file.toJSON();
    }
}
