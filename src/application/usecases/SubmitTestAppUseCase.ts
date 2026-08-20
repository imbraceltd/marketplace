import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';
import _Error, { handleServiceError } from '../../utils/error';
import { IDataObject } from '../../core/domains/interface/types';
import { Method } from 'axios';

interface ISubmitReturn {
    result: IDataObject;
    status: number;
}

export class SubmitTestAppUseCase {
    async execute(appId: string, method: Method, data: IDataObject): Promise<ISubmitReturn | undefined> {
        try {
            const repository = AppRepositoryFactory.create();
            const app = await repository.findById(appId);
            if (!app) {
                throw new _Error('App not found', 400);
            }

            throw new _Error('Workflow not configured', 400);
        } catch (error) {
            throw handleServiceError(error);
        }
    }
}
