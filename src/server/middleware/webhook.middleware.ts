import logger from '../logging/logger';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const parseWebhookContext = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const app_secret = req.headers['x-app-secret'] as string;

  req.webhookContext = {
    app_secret: app_secret,
  };

  next();
};

export const authorizeWebhook = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { webhookContext } = req;
  logger.info({ req });
  const { app_secret } = webhookContext || {};
  const signature = req.headers['x-hub-signature'] as string;

  if (!app_secret) {
    logger.error('Missing webhook context');
    return res.status(201).send();
  }

  if (!signature) {
    logger.error('Missing webhook signature');
    return res.status(201).send();
  }

  logger.debug('Received webhook: ', { signature, webhookContext });

  // check message valid
  const elements = signature.split('=');
  const expectedHash = crypto
    .createHmac('sha1', app_secret)
    .update(req.rawBody)
    .digest('hex');
  if (elements[1] !== expectedHash) {
    logger.error(
      `Incorrect facebook message hash in ${elements[0]}: ${elements[1]}, expected ${expectedHash}`
    );
    return res.status(201).send();
  }
  next();
};
