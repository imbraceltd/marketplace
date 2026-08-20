import { Request, Response } from 'express';
import { FileRepositoryFactory } from '../../../../infrastructure/repositories/factories';
import storage from '../../../../files';
import { GetAllFilesUseCase } from '../../../../application/usecases/GetAllFilesUseCase';
import { GetFileByIdUseCase } from '../../../../application/usecases/GetFileByIdUseCase';
import { UploadFileUseCase } from '../../../../application/usecases/UploadFileUseCase';
import { DeleteFileUseCase } from '../../../../application/usecases/DeleteFileUseCase';
import { DownloadFileUseCase } from '../../../../application/usecases/DownloadFileUseCase';
import { handleControllerError } from '../../../../utils/error';

export class FileController {
    private static repository = FileRepositoryFactory.create();
    private static storage = storage;

    static async getAll(req: Request, res: Response) {
        try {
            const useCase = new GetAllFilesUseCase(FileController.repository);
            const userContext = (req as any).userContext;
            const files = await useCase.execute(userContext);
            return res.status(200).json({ data: files });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const useCase = new GetFileByIdUseCase(FileController.repository);
            const userContext = (req as any).userContext;
            const file = await useCase.execute(userContext, req.params.id);
            return res.status(200).json({
                message: 'File details',
                data: file
            });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async uploadFile(req: Request, res: Response) {
        try {
            const useCase = new UploadFileUseCase(FileController.repository, FileController.storage);
            const userContext = (req as any).userContext;
            const isPublic = req.params.is_public === 'true';
            const file = req.file;
            const newFile = await useCase.execute(userContext, file, isPublic);
            return res.status(200).json({
                message: 'File uploaded successfully',
                data: newFile
            });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async downloadFile(req: Request, res: Response) {
        try {
            const { short_path } = req.params;
            const useCase = new DownloadFileUseCase(FileController.repository, FileController.storage);
            const result = await useCase.execute(short_path);

            const { file, stream, headers, statusCode } = result;

            res.status(statusCode).set(headers);
            res.set('content-disposition', `inline; filename="${file.name}"`);
            res.set('content-type', file.file_type || 'application/octet-stream');

            if (/\.(jpg|png|gif)$/.test(file.file_path || '')) {
                res.set('cache-control', 'max-age=3600');
            }

            stream.pipe(res);
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const useCase = new DeleteFileUseCase(FileController.repository, FileController.storage);
            const userContext = (req as any).userContext;
            const deleted = await useCase.execute(userContext, req.params.id);
            return res.status(200).json({
                message: 'File deleted successfully',
                data: deleted
            });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    // Keep original update for consistency if needed, though v1 doesn't have it
    static async update(req: Request, res: Response) {
        try {
            const file = await FileController.repository.update(req.params.id, req.body);
            if (!file) return res.status(404).json({ message: 'File not found' });
            return res.status(200).json(file.toJSON());
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    }
}
