import logger from '../../../logging/logger';
import { Request, Response } from 'express';
import { HandleFacebookWebhookUseCase } from '../../../../application/usecases/HandleFacebookWebhookUseCase';
import config from '../../../../config';

export class WebhookController {
    static async verify(req: Request, res: Response) {
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

            if (!token || token !== config.facebookVerifyToken) {
                return res.status(403).json({
                    message: 'Invalid verify token',
                });
            }

            logger.info('WEBHOOK_VERIFIED');
            return res.status(200).send(challenge);
        } catch (error) {
            return res.status(500).json({
                message: 'Error verifying webhook',
            });
        }
    }

    static async handle(req: Request, res: Response) {
        try {
            const useCase = new HandleFacebookWebhookUseCase();
            const result = await useCase.execute(req.body);
            logger.debug('Kafka response: ', result);

            return res.status(200).json({
                message: 'Received webhook',
            });
        } catch (error) {
            return res.status(201).json({
                message: 'Error receiving webhook',
            });
        }
    }
}
