import { Router } from 'express';
import webhookControllers from './webhooks/webhook.controllers';
const webhookRouter = Router();

webhookRouter.get('/facebook', webhookControllers.verifyFacebookWebhook);
webhookRouter.post('/facebook', webhookControllers.facebookWebhook);

export default webhookRouter;