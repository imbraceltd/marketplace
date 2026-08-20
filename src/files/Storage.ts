export interface Storage {
    uploadFile: (file: Express.Multer.File, org_id: string, options?: FileUploadOptions) => Promise<FileResult>;
    deleteFile: (path: string) => Promise<boolean>;
    downloadFile: (path: string) => Promise<unknown>;
    provide: () => StorageType;
}


export interface FileResult {
    path: string;
    key: string;
    url: string;
    expire_at?: number;
}


export interface FileUploadOptions {
    file_path?: string;
    file_name?: string;
    file_url?: string;
}

// Enum for storage types
export enum StorageType {
    LOCAL = 'local',
    S3 = 's3',
}