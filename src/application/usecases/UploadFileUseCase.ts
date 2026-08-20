import { IFileRepository } from '../interfaces/repositories/IFileRepository';
import { generateShortPath } from '../../core/domains/interface/files';
import _Error from '../../utils/error';

export class UploadFileUseCase {
    constructor(
        private repository: IFileRepository,
        private s3Storage: any
    ) { }

    async execute(userContext: any, file: any, isPublic: boolean = false) {
        const organizationId = userContext.org_id;
        if (!organizationId) throw new _Error('Organization id is required', 400);

        const originalname = file.originalname;
        if (!originalname) {
            throw new _Error('File name is required', 400);
        }

        // Upload to S3
        const uploadResult = await this.s3Storage.uploadFile(file, organizationId);
        const { key, url } = uploadResult;

        const fileData = {
            organization_id: organizationId,
            name: originalname,
            file_path: key,
            size: file.size,
            file_type: file.mimetype,
            file_extension: file.mimetype.split('/')[1],
            file_url: url,
            is_public: isPublic,
            short_path: generateShortPath(key, organizationId),
        };

        return await this.repository.create(fileData);
    }
}
