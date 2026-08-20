import { Request, Response } from 'express';
import { AppRepositoryFactory } from '../../../../infrastructure/repositories/factories';
import { CreateAppUseCase } from '../../../../application/usecases/CreateAppUseCase';
import { DeleteAppUseCase } from '../../../../application/usecases/DeleteAppUseCase';
import { ActivateAppUseCase } from '../../../../application/usecases/ActivateAppUseCase';
import { DeactivateAppUseCase } from '../../../../application/usecases/DeactivateAppUseCase';
import { UpdateAppSettingsUseCase } from '../../../../application/usecases/UpdateAppSettingsUseCase';
import { GetAppSettingsUseCase } from '../../../../application/usecases/GetAppSettingsUseCase';
import { GetAppSettingsByWorkflowIdUseCase } from '../../../../application/usecases/GetAppSettingsByWorkflowIdUseCase';
import { GetRequiredCredentialsUseCase } from '../../../../application/usecases/GetRequiredCredentialsUseCase';
import { SubmitAppUseCase } from '../../../../application/usecases/SubmitAppUseCase';
import { SubmitTestAppUseCase } from '../../../../application/usecases/SubmitTestAppUseCase';
import { GetUsedChannelsUseCase } from '../../../../application/usecases/GetUsedChannelsUseCase';
import { GetUsedChannelsV2UseCase } from '../../../../application/usecases/GetUsedChannelsV2UseCase';
import { HandleSubscriptionUseCase } from '../../../../application/usecases/HandleSubscriptionUseCase';
import { HandleSubscriptionV2UseCase } from '../../../../application/usecases/HandleSubscriptionV2UseCase';
import { GetOrgUserListUseCase } from '../../../../application/usecases/GetOrgUserListUseCase';
import { GetAppsUseCase } from '../../../../application/usecases/GetAppsUseCase';
import { GetAppByIdUseCase } from '../../../../application/usecases/GetAppByIdUseCase';
import { UpdateAppUseCase } from '../../../../application/usecases/UpdateAppUseCase';
import { IDataObject } from '../../../../core/domains/interface/types';
import { getBoardTemplateById } from '../../../../core/repositories/boards.repository';
import _Error, { handleControllerError } from '../../../../utils/error';
import { Method } from 'axios';

export class AppController {
    private static repository = AppRepositoryFactory.create();

    static async getAll(req: Request, res: Response) {
        try {
            const useCase = new GetAppsUseCase(AppController.repository);
            const userContext = (req as any).userContext;
            const query = req.query as IDataObject;
            const apps = await useCase.execute(userContext, query);
            return res.status(200).json({ data: apps });
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getById(req: Request, res: Response) {
        try {
            const useCase = new GetAppByIdUseCase(AppController.repository);
            const userContext = (req as any).userContext;
            const app = await useCase.execute(userContext, req.params.id);
            return res.status(200).json({ data: app });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const useCase = new CreateAppUseCase(AppController.repository);
            const userContext = (req as any).userContext;
            const app = await useCase.execute(userContext, req.body);
            return res.status(200).json({ data: app.toJSON() });
        } catch (error) {
            const { message, code } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const useCase = new UpdateAppUseCase(AppController.repository);
            const userContext = (req as any).userContext;
            const app = await useCase.execute(req.params.id, userContext, req.body);
            return res.status(200).json({ data: app.toJSON() });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const useCase = new DeleteAppUseCase(AppController.repository);
            const userContext = (req as any).userContext;
            const result = await useCase.execute(userContext, req.params.id);
            return res.status(200).json({
                data: {
                    message: `App ${req.params.id} deleted`,
                    ...result
                }
            });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    // ========== App Settings & Utils ==========

    static async activate(req: Request, res: Response) {
        try {
            const useCase = new ActivateAppUseCase();
            const userContext = (req as any).userContext;
            await useCase.execute(userContext, req.params.id);
            return res.status(200).json({
                data: {
                    message: `App ${req.params.id} activated`
                }
            });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async deactivate(req: Request, res: Response) {
        try {
            const useCase = new DeactivateAppUseCase();
            const userContext = (req as any).userContext;
            await useCase.execute(userContext, req.params.id);
            return res.status(200).json({
                data: {
                    message: `App ${req.params.id} de-activated`
                }
            });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async updateSettings(req: Request, res: Response) {
        try {
            const useCase = new UpdateAppSettingsUseCase();
            const userContext = (req as any).userContext;
            const { options, credentials, user_progress, channel } = req.body;
            const result = await useCase.execute(userContext, req.params.id, options, credentials, user_progress, channel);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getSettingsById(req: Request, res: Response) {
        try {
            const useCase = new GetAppSettingsUseCase();
            const userContext = (req as any).userContext;
            const result = await useCase.execute(userContext, req.params.id);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getSettingsByWorkflowId(req: Request, res: Response) {
        try {
            const useCase = new GetAppSettingsByWorkflowIdUseCase();
            const result = await useCase.execute(req.params.id);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getRequiredCredentials(req: Request, res: Response) {
        try {
            const useCase = new GetRequiredCredentialsUseCase();
            const userContext = (req as any).userContext;
            const appId = req.params.appId || req.params.id;
            const result = await useCase.execute(userContext, appId);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getBoardTemplate(req: Request, res: Response) {
        try {
            const userContext = (req as any).userContext;
            const result = await getBoardTemplateById(userContext.org_id, req.params.boardId);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async submit(req: Request, res: Response) {
        try {
            const useCase = new SubmitAppUseCase();
            const method = req.method as Method;
            const result = await useCase.execute(req.params.appId, method, req.body);
            if (result) {
                return res.status(result.status).json({ data: result.result });
            }
            return res.status(500).json({ message: 'No result' });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async submitTest(req: Request, res: Response) {
        try {
            const useCase = new SubmitTestAppUseCase();
            const method = req.method as Method;
            const result = await useCase.execute(req.params.appId, method, req.body);
            if (result) {
                return res.status(result.status).json({ data: result.result });
            }
            return res.status(500).json({ message: 'No result' });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getUsedChannels(req: Request, res: Response) {
        try {
            const useCase = new GetUsedChannelsUseCase();
            const userContext = (req as any).userContext;
            let ids = req.query.ids as string[];
            const productId = req.query.product_id as string;

            if (ids && !Array.isArray(ids) && typeof ids === 'string' && ids !== '') {
                ids = (ids as string).split(',');
            }

            const result = await useCase.execute(userContext, ids || [], productId);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getUsedChannelsV2(req: Request, res: Response) {
        try {
            const useCase = new GetUsedChannelsV2UseCase();
            const userContext = (req as any).userContext;
            let ids = req.query.ids as string[];

            if (ids && !Array.isArray(ids) && typeof ids === 'string' && ids !== '') {
                ids = (ids as string).split(',');
            }

            const result = await useCase.execute(userContext, ids || []);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async getStatus(req: Request, res: Response) {
        try {
            const useCase = new GetAppsUseCase(AppController.repository);
            const userContext = (req as any).userContext;
            const apps = await useCase.execute(userContext, req.query as IDataObject);

            const statusCounts = {
                publish: 0,
                draft: 0,
                'on review': 0,
            };

            for (const app of apps) {
                const user_progress = app.user_progress || {};
                const finished = user_progress.finished;
                const status = user_progress.status || null;
                let appStatus: string;

                if (finished === true && (status === null || status === 'IN_USE')) {
                    appStatus = 'publish';
                } else if (status === 'IN_REVIEW') {
                    appStatus = 'on review';
                } else {
                    appStatus = 'draft';
                }

                const statusKey = appStatus as keyof typeof statusCounts;
                statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
            }

            return res.status(200).json({ data: statusCounts });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    // ========== Email Subscription (same path as v1: /apps/subscriptions, /apps/opts) ==========

    static async handleSubscription(req: Request, res: Response) {
        try {
            const useCase = new HandleSubscriptionUseCase();
            const result = await useCase.execute(req.body);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }

    static async handleOpts(req: Request, res: Response) {
        try {
            const useCase = new HandleSubscriptionV2UseCase();
            const result = await useCase.execute(req.body);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message, error_code } = handleControllerError(error);
            return res.status(code).json({ message, error_code });
        }
    }

    static async getOrgUserList(req: Request, res: Response) {
        try {
            const useCase = new GetOrgUserListUseCase();
            const userContext = (req as any).userContext;
            const result = await useCase.execute(userContext);
            return res.status(200).json({ data: result });
        } catch (error: any) {
            const { code, message } = handleControllerError(error);
            return res.status(code).json({ message });
        }
    }
}
