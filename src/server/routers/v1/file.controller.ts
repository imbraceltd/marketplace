import logger from '../../logging/logger';
import { Request, Response } from 'express';
import { handleControllerError } from '../../../utils/error';
import s3 from '../../../aws_s3';
import _Error from '../../../utils/error';
import IFile, {
  generateShortPath,
} from '../../../core/domains/interface/files';
import authorize from '../../middleware/authorize.middleware';
import { FileRepositoryFactory } from '../../../infrastructure/repositories/factories/FileRepositoryFactory';

const fileRepository = FileRepositoryFactory.create();

// No service layer for this controller for faster development
const fileController = {
  uploadFile: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        logger.debug('Uploading File');
        const { file, userContext } = req;
        const { is_public } = req.params;
        const originalname = file?.originalname;
        if (!originalname) {
          throw new _Error('File name is required', 400);
        }

        logger.debug('Uploading File to AWS S3', { file });

        const key = s3.generateKey(originalname, userContext.org_id);
        const result = await s3.uploadFile(file?.buffer, key);
        logger.debug('Uploaded File to AWS S3', { result, key });

        const fileData: IFile = {
          organization_id: userContext.org_id,
          name: originalname,
          file_path: key,
          size: file?.size,
          file_type: file?.mimetype,
          file_extension: file?.mimetype.split('/')[1],
          file_url: s3.genLink(key), // aws url
          is_public: is_public === 'true',
          short_path: generateShortPath(key, userContext.org_id), // public id
        };
        const newFile = await fileRepository.create(fileData);
        return res.status(200).json({
          message: 'File uploaded successfully',
          data: newFile,
        });
      } catch (error) {
        logger.error('Error uploading file', { error });
        const { code, message } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  downloadFile: [
    async (req: Request, res: Response) => {
      try {
        const { short_path: shortPath } = req.params;

        const file = await fileRepository.findByShortPath(shortPath);

        if (!file) {
          throw new _Error('File not found', 404);
        }

        if (!file.file_path) {
          throw new _Error('File path is not found', 404);
        }

        const response = await s3.download(file.file_path);

        if (response.error) {
          const { error, metadata, statusCode, statusMessage } = response;
          logger.error(
            `Error ${statusCode} getting ${file.file_path}`,
            error,
            metadata
          );
          res.status(statusCode).send(statusMessage);
          return;
        }
        const { statusCode, headers, body } = response;
        res.status(statusCode).set(headers);
        res.set('content-disposition', `inline; filename="${file.name}"`);
        res.set('content-type', file?.file_type || 'application/octet-stream');

        if (/\.(jpg|png|gif)$/.test(file.file_path)) {
          res.set('cache-control', 'max-age=3600');
        }
        logger.debug('Downloading file', { file });
        body.pipe(res);
        return;
      } catch (error) {
        logger.error('Error downloading file', { error });
        const { code, message } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  deleteFile: [
    authorize,
    async (req: Request, res: Response) => {
      try {
        const { id: fileId } = req.params;

        if (!fileId) {
          throw new _Error('File id is required', 400);
        }

        const file = await fileRepository.findById(fileId);

        if (!file) {
          throw new _Error('File not found', 404);
        }

        if (!file.file_path) {
          throw new _Error('File path is not found', 404);
        }

        const result = await s3.deleteFile(file.file_path);
        await fileRepository.delete(fileId);
        return res.status(200).json({
          message: 'File deleted successfully',
          data: result,
        });
      } catch (error) {
        const { code, message } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  getFileDetails: [
    async (req: Request, res: Response) => {
      try {
        const { id: fileId } = req.params;

        if (!fileId) {
          throw new _Error('File id is required', 400);
        }

        const file = await fileRepository.findById(fileId);

        if (!file) {
          throw new _Error('File not found', 404);
        }

        return res.status(200).json({
          message: 'File details',
          data: file,
        });
      } catch (error) {
        const { code, message } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },

  ],
};

export default fileController;
