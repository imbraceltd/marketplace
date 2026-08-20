import logger from '../../logging/logger';
import { Request, Response } from 'express';
import { IFacebookPageChanges } from '../../../core/domains/interface/webhooks/FacebookFanpage';
import { handleFacebookWebhook } from '../../../core/services/webhook.service';

const webhookControllers = {
  facebookWebhook: [
    async (req: Request, res: Response) => {
      
      try {
        const kafkaRESP = await handleFacebookWebhook(
            req.body as IFacebookPageChanges
            );

        logger.debug('Kafka response: ', kafkaRESP);

        res.status(200).json({
          message: 'Received webhook',
        });
      } catch (error) {
        res.status(201).json({
          message: 'Error receiving webhook',
        });
      }
    },
  ],

  verifyFacebookWebhook: [
    async (req: Request, res: Response) => {
      const { query } = req;
      try {
        const mode = query['hub.mode'];
        const challenge = query['hub.challenge'];
        const token = query['hub.verify_token'];

        logger.debug('Received webhook verification request: ', {
          mode,
          challenge,
          token,
        });

        if (!token || token !== process.env.FACEBOOK_VERIFY_TOKEN) {
          res.status(403).json({
            message: 'Invalid verify token',
          });
        }

        logger.info('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      } catch (error) {
        res.status(500).json({
          message: 'Error verifying webhook',
        });
      }
    },
  ],
};

export default webhookControllers;
