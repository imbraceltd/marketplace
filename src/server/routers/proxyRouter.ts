import logger from '../logging/logger';
import proxy from 'express-http-proxy';
import { Method } from 'axios';

import { Request, Response, Router } from 'express';
import { GetWebhookUrlUseCase } from '../../application/usecases/GetWebhookUrlUseCase';
import multer from 'multer';
import { handleControllerError } from '../../utils/error';

const upload = multer({
  storage: multer.memoryStorage(),

  // limit 50mb
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

const proxyRouter = Router();

const proxyBaseURL: (req: Request) => string = (req: Request) => {
  if (!req.wfURL) {
    throw new Error('No webhook URL found');
  }

  return req.wfURL as string;
};

// submit test
proxyRouter.use(
  '/submissions-test/:appId',
  // middleware to get the webhook URL {webhookId: string, baseUrl: string}
  async (req: Request, res: Response, next) => {
    try {
      const appId = req.params.appId;
      const method = req.method as Method;
      const useCase = new GetWebhookUrlUseCase();
      const webhook = await useCase.execute(appId, method, {});

      if (!webhook) {
        return res.status(404).send('Webhook not found');
      }

      req.webhookId = webhook.webhookId;
      req.wfURL = webhook.baseURL;

      next();
    } catch (error) {
      const { code, message } = handleControllerError(error);
      res.status(code).json({
        message,
      });
    }
  },
  proxy(proxyBaseURL, {
    proxyReqPathResolver: (req) => {
      // Use the original URL path for the proxy but rewrite it as needed
      const appId = req.params.appId;

      logger.info('appId: ', appId);
      logger.info('req.webhookId: ', req.webhookId);
      logger.info('req.baseUrl: ', req.wfURL);
      return `/webhook-test/${req.webhookId}`;
    },
    limit: '50mb',
  })
);

// submissions
proxyRouter.use(
  '/submissions/schedulers/:appId',
  upload.array("files"),
  // middleware to get the webhook URL {webhookId: string, baseUrl: string}
  async (req: Request, res: Response, next) => {
    try {
      const appId = req.params.appId;
      const method = req.method as Method;
      const { payload } = req.body;

      if (!payload) {
        return res.status(400).send({ message: 'payload is required' });
      }
      const files = Array.isArray(req.files) ? req.files : [];
      const parsedPayload = JSON.parse(payload);

      const useCase = new GetWebhookUrlUseCase();
      const webhook = await useCase.execute(appId, method, parsedPayload, files);

      if (!webhook) {
        return res.status(404).send({ message: 'Webhook not found' });
      }

      if (webhook.result) {
        return res.status(webhook.status ?? 500).send(webhook.result);

      } else {
        req.webhookId = webhook.webhookId;
        req.wfURL = webhook.baseURL;

        next();
      }
    } catch (error) {
      const { code, message } = handleControllerError(error);
      res.status(code).json({
        message,
      });
    }

  },
  proxy(proxyBaseURL, {
    proxyReqPathResolver: (req) => {
      // Use the original URL path for the proxy but rewrite it as needed
      const appId = req.params.appId;

      logger.info('appId: ', appId);
      logger.info('req.webhookId: ', req.webhookId);
      logger.info('req.baseUrl: ', req.wfURL);

      return `/webhook/${req.webhookId}`;
    },
    limit: '50mb',
  })
);

// submissions
proxyRouter.use(
  '/submissions/:appId',
  // middleware to get the webhook URL {webhookId: string, baseUrl: string}
  async (req: Request, res: Response, next) => {
    try {
      const appId = req.params.appId;
      const method = req.method as Method;

      const files = Array.isArray(req.files) ? req.files : [];

      const useCase = new GetWebhookUrlUseCase();
      const webhook = await useCase.execute(appId, method, {}, files);

      if (!webhook) {
        return res.status(404).send({ message: 'Webhook not found' });
      }

      if (webhook.result) {
        return res.status(webhook.status ?? 500).send(webhook.result);

      } else {
        req.webhookId = webhook.webhookId;
        req.wfURL = webhook.baseURL;

        next();
      }
    } catch (error) {
      const { code, message } = handleControllerError(error);
      res.status(code).json({
        message,
      });
    }

  },
  proxy(proxyBaseURL, {
    proxyReqPathResolver: (req) => {
      // Use the original URL path for the proxy but rewrite it as needed
      const appId = req.params.appId;

      logger.info('appId: ', appId);
      logger.info('req.webhookId: ', req.webhookId);
      logger.info('req.baseUrl: ', req.wfURL);

      return `/webhook/${req.webhookId}`;
    },
    limit: '50mb',
  })
);

export default proxyRouter;
