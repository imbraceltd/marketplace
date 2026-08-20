import logger from '../server/logging/logger';
import { FileResult, FileUploadOptions, Storage, StorageType } from "./Storage";
import fs from 'fs';
import config from '../config';
import path from 'path';
class LocalStorage implements Storage {
    file_path: string;

    // this refer to the gateway url
    // passed from header x-forwarded-url
    forwarded_url: string;

    constructor(forward_url: string) {
        if (!config.file.path) {
            throw new Error('File path is not set');
        }
        this.file_path = config.file.path;
        this.forwarded_url = forward_url;
    }

    provide() {
        return StorageType.LOCAL;
    }

    async uploadFile(file: Express.Multer.File, org_id?: string, options?: FileUploadOptions): Promise<FileResult> {
        logger.debug(`${org_id ? `Org ${org_id} - ` : ''}Uploading ${file.originalname} to local storage`);
        logger.info('Multer did it, we just need to save it to db')

        const filePath = `${options?.file_path || this.file_path}`
        const fileName = `${options?.file_name || file.originalname}`

        return {
            path: `${filePath}/${fileName}`,
            key: `${filePath}/${fileName}`,
            url: ''
        }
    }

    // key is path: ~/mnt/data/org_id/timestamp/file_name
    async deleteFile(key: string): Promise<boolean> {
        logger.info('Deleting file from local storage', { key });
        await fs.promises.unlink(key);
        return true;
    }

    async downloadFile(fileName: string): Promise<Buffer> {
        logger.info('Downloading file from local storage', { fileName });
        const filePath = path.join(this.file_path, fileName);
        return await fs.promises.readFile(filePath);
    }
}

export default LocalStorage;    