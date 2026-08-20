import logger from '../../logging/logger';
import { Request, Response } from 'express';
import { handleControllerError } from '../../../utils/error';
import _Error from '../../../utils/error';
import authorize from '../../middleware/authorize.middleware';
import * as fileService from '../../../core/services/file.service';
import storage from '../../../files';
import config from '../../../config';
import fs from 'fs';
import { S3Response } from 's3-serve/build/lib/S3Response';
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

        const isPublic = is_public === 'true';

        const result = await fileService.uploadFile(file, userContext.org_id, isPublic, {
          file_path: req.fileUploadPath,
          file_name: req.fileUploadName,
        });

        return res.status(200).json({
          message: 'File uploaded successfully',
          data: result,
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

        // Incase S3
        if (!config.use_local_storage) {
          const response = (await storage.downloadFile(file.file_path)) as unknown as S3Response;
          if (response.error) {
            const { error, metadata, statusCode, statusMessage } = response;
            logger.error(
              `Error ${statusCode} getting ${file.file_path}`,
              error,
              metadata
            );
            return res.status(statusCode).send(statusMessage);
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
        }

        // Local Storage
        // Check if the file exists
        if (!fs.existsSync(file.file_path)) {
          return res.status(404).json({ error: "File not found" });
        }

        return res.download(file.file_path, (error) => {
          if (error) {
            logger.error('Error downloading file', { error });
            return res.status(500).json({ error: "Error downloading file" });
          }
        });
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
        const { userContext } = req;
        const { id: fileId } = req.params;
        const result = await fileService.deleteFile(userContext.org_id, {
          file_id: fileId,
        });
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
