import { IFileRepository } from '../interfaces/repositories/IFileRepository';
import _Error from '../../utils/error';

export class DownloadFileUseCase {
    constructor(
        private repository: IFileRepository,
        private s3Storage: any
    ) { }

    async execute(shortPath: string) {
        const file = await this.repository.findByShortPath(shortPath);

        if (!file) {
            throw new _Error('File not found', 404);
        }

        if (!file.file_path) {
            throw new _Error('File path is not found', 404);
        }

        const data = await this.s3Storage.downloadFile(file.file_path);

        return {
            file,
            stream: data.body,
            headers: data.headers,
            statusCode: data.statusCode
        };
    }
}
