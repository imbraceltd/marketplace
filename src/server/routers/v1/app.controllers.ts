import logger from '../../logging/logger';
import { Request, Response } from 'express';
import {
  createApp,
  updateAppById,
  updateAppSettingsById,
  deleteAppById,
  activateApp,
  getAppSettingsById,
  webhook,
  webhookTest,
  getAppById,
  getAppSettingsByWorkflowId,
  getApps,
  getRequiredCredentials,
  getUsedChannels,
  deActivateApp,
} from '../../../core/services/app_v2.service';
import { getBoardTemplateById } from '../../../core/repositories/boards.repository';
import _Error, { handleControllerError } from '../../../utils/error';
import authorize from '../../middleware/authorize.middleware';
import { Method } from 'axios';
import { IDataObject } from '../../../core/domains/interface/types';

// array of controller and middleware functions
const appController = {
  hello: [
    async (_req: Request, res: Response): Promise<Response> => {
      return res.status(200).json({ message: 'Hello World!' });
    },
  ],

  createApp: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const newApp = await createApp(req.userContext, req.body);
        return res.status(200).json({ data: newApp });
      } catch (error) {
        if (error instanceof _Error) {
          const { message, code } = handleControllerError(error);
          return res.status(code).json({ message });
        }

        return res.status(500).json({ error });
      }
    },
  ],

  getApps: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const query = req.query as IDataObject;
        const apps = await getApps(req.userContext, query);
        return res.status(200).json({ data: apps });
      } catch (error) {
        logger.info(error);
        return res.status(400).json({ error });
      }
    },
  ],

  getAppById: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const appId = req.params.id;
        if (!appId) {
          throw new _Error('App not found', 400);
        }
        const app = await getAppById(req.userContext, appId);
        return res.status(200).json({ data: app });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  deleteApp: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const appId = req.params.id;
        if (!appId) {
          throw new _Error('App not found', 400);
        }
        const data = await deleteAppById(req.userContext, appId);
        return res.status(200).json({
          data: {
            message: `App ${appId} deleted`,
            ...data,
          },
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  updateApp: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const id = req.params.id;
        if (!id) {
          throw new _Error('App not found', 400);
        }

        return res.status(200).json({
          data: await updateAppById(req.userContext, req.params.id, req.body),
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  updateAppSettings: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const appId = req.params.id;
        if (!appId) {
          throw new _Error('App ID is required', 400);
        }

        const { options, credentials, user_progress, channel } = req.body;

        logger.info({ options, credentials, appId, user_progress, channel });

        const settings = await updateAppSettingsById(
          req.userContext,
          appId,
          options,
          credentials,
          user_progress,
          channel
        );

        return res.status(200).json({
          data: settings,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  submit: [
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const { appId } = req.params;
        const method = req.method as Method;
        if (!appId) {
          throw new _Error('App ID is required', 400);
        }

        // proxy request to workflow
        const resp = await webhook(appId, method, req.body);

        if (!resp) {
          throw new _Error('App not found', 400);
        }

        return res.status(resp.status).json({
          data: resp.result,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  submitTest: [
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const { appId } = req.params;
        const method = req.method as Method;
        if (!appId) {
          throw new _Error('App ID is required', 400);
        }

        // proxy request to workflow
        const resp = await webhookTest(appId, method, req.body);

        if (!resp) {
          throw new _Error('App not found', 400);
        }

        return res.status(resp.status).json({
          data: resp.result,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  activateApp: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const appId = req.params.id;
        if (!appId) {
          throw new _Error('App ID is required', 400);
        }
        await activateApp(req.userContext, appId);
        return res.status(200).json({
          data: {
            message: `App ${appId} activated`,
          },
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  deActivateApp: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const appId = req.params.id;
        if (!appId) {
          throw new _Error('App ID is required', 400);
        }
        await deActivateApp(req.userContext, appId);
        return res.status(200).json({
          data: {
            message: `App ${appId} de-activated`,
          },
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  getAppSettingsById: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const appId = req.params.id;
        if (!appId) {
          throw new _Error('App ID is required', 400);
        }

        const settings = await getAppSettingsById(req.userContext, appId);

        return res.status(200).json({
          data: settings,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },

    // restore default settings
  ],

  getAppSettingsByWorkflowId: [
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const workflowId = req.params.id;
        if (!workflowId) {
          throw new _Error('Workflow ID is required', 400);
        }

        const settings = await getAppSettingsByWorkflowId(
          req.userContext,
          workflowId
        );

        return res.status(200).json({
          data: settings,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  getRequiredCredentials: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const appId = req.params.id;
        if (!appId) {
          throw new _Error('App ID is required', 400);
        }

        const mapCredentials = await getRequiredCredentials(
          req.userContext,
          appId
        );

        return res.status(200).json({
          data: mapCredentials,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],
  getBoardTemplate: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const boardId = req.params.boardId;
        if (!boardId) {
          throw new _Error('Board ID is required', 400);
        }

        const userContext = req.userContext;
        const orgId = userContext.org_id;
        if (!orgId) {
          throw new _Error('Org ID is required', 400);
        }

        const board = await getBoardTemplateById(orgId, boardId);

        return res.status(200).json({
          data: board,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],

  getUsedChannels: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        let ids = req.query.ids as string[];
        const productId = req.query.product_id as string;

        if (!ids) {
          throw new _Error('Ids are required', 400);
        }

        if (!Array.isArray(ids) && typeof ids === 'string' && ids !== '') {
          ids = [ids];
        }

        if (ids.length === 0) {
          return res.status(200).json({
            data: {},
          });
        }

        const mapChannels = await getUsedChannels(
          req.userContext,
          ids,
          productId
        );

        return res.status(200).json({
          data: mapChannels,
        });
      } catch (error) {
        logger.info(error);
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],
  getAppStatus: [
    authorize,
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const query = req.query as IDataObject;
        const apps = await getApps(req.userContext, query);
        logger.info('apps', apps);
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
        return res.status(200).json({
          data: statusCounts,
        });
      } catch (error) {
        const { message, code } = handleControllerError(error);
        return res.status(code).json({ message });
      }
    },
  ],
};

export default appController;
