import { IFileRepository } from '../interfaces/repositories/IFileRepository';
import _Error from '../../utils/error';

export class DeleteFileUseCase {
    constructor(
        private repository: IFileRepository,
        private s3Storage: any
    ) { }

    async execute(userContext: any, id: string) {
        if (!id) throw new _Error('File id is required', 400);
        const organizationId = userContext.org_id;
        if (!organizationId) throw new _Error('Organization id is required', 400);

        const file = await this.repository.findById(id);
        if (!file || file.organization_id !== organizationId) {
            throw new _Error('File not found', 404);
        }

        if (!file.file_path) {
            throw new _Error('File path is not found', 404);
        }

        if (file.file_path) {
            await this.s3Storage.deleteFile(file.file_path);
        }

        return await this.repository.delete(id);
    }
}
