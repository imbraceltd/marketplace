import logger from '../../server/logging/logger';
import { handleServiceError } from '../../utils/error';
import { IFacebookPageChanges } from '../domains/interface/webhooks/FacebookFanpage';
import _Error from '../../utils/error';
import { Message } from 'kafkajs';

import kafka from '../../kafka';
import { AppRepositoryFactory } from '../../infrastructure/repositories/factories/AppRepositoryFactory';

const appRepository = AppRepositoryFactory.create();

const WORKFLOW_TOPIC = 'ROUTER.OUTGOING_MESSAGE';

export const handleFacebookWebhook = async (payload: IFacebookPageChanges) => {
  try {
    logger.debug('payload: ', JSON.stringify(payload, null, 2));

    const { channel, partition, message } = payload;
    if (!channel || !message) {
      throw new _Error('Missing channel or message', 400);
    }

    const apps = await appRepository.findByChannelIds([channel._id], channel.organization_id);
    if (!apps || apps.length === 0) {
      logger.error('No app found for channel: ', {
        channel_id: channel._id,
        message,
      });
    }
    // publish message to kafka
    const kafkaMessages: Message[] = apps.map((app) => {
      const kafkaMessageKey = `${app.id}-${Date.now()}`;
      const kafkaValue = {
        message,
        organization_id: channel.organization_id,
        channel_id: channel._id,
        file_host: process.env.BACKEND_HOST,
        workflow_id: app?.workflow_id,
      };

      logger.info('kafkaValue: ', JSON.stringify(kafkaValue, null, 2));

      const kafkaMessage: Message = {
        key: kafkaMessageKey,
        value: JSON.stringify(kafkaValue),
        partition,
        timestamp: Date.now().toString(),
        headers: {
          'x-channel-id': channel._id.toString(),
          'x-organization-id': channel.organization_id.toString(),
        },
      };

      return kafkaMessage;
    });

    const res = await kafka.send(WORKFLOW_TOPIC, kafkaMessages);
    return res;
  } catch (error) {
    throw handleServiceError(error);
  }
};
