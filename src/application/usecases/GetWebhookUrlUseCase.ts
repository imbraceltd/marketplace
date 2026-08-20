import logger from '../../server/logging/logger';
import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';
import _Error, { handleServiceError } from '../../utils/error';
import { IDataObject } from '../../core/domains/interface/types';
import { Method } from 'axios';

export class GetWebhookUrlUseCase {
    async execute(
        appId: string,
        method: Method,
        data: IDataObject,
        files?: Express.Multer.File[]
    ): Promise<{ result?: any; status?: number; baseURL: string; webhookId: string }> {
        try {
            const repository = AppRepositoryFactory.create();
            const app = await repository.findById(appId);
            if (!app) {
                throw new _Error('App not found', 400);
            }

            throw new _Error('Workflow not configured', 400);
        } catch (error) {
            logger.error('Error getting webhook url', error);
            throw handleServiceError(error);
        }
    }
}
