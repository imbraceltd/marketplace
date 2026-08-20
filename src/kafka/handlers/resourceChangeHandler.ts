import logger from '../../server/logging/logger';
import { Message } from 'kafkajs';
import { deleteTeamForms } from '../../core/services/form.service';
import { handleDeleteCategory } from '../../core/services/email_template_v2.service';
import { TeamId } from 'aws-sdk/clients/kendra';

const resourceChangeHandler = async (message: Message, partition?: number) => {
  try {
    logger.error('Message received', message?.value?.toString());
    // parse message value to JSON
    const parsedMessage = message.value && JSON.parse(message.value.toString());

    if (!parsedMessage) {
      logger.error('Invalid message received', message?.value?.toString());
      return;
    }

    // handle message based on type
    switch (parsedMessage.type) {
      case 'team':
        // handle team resource change
        switch (parsedMessage.action) {
          case 'DELETE':
            // delete team forms
            await deleteTeamForms(parsedMessage.data as TeamId);
            break;
          default:
            logger.error('Invalid action received', parsedMessage.action);
            break;
        }
        break;
      case 'category':
        // handle category resource change
        switch (parsedMessage.action) {
          case 'DELETE':
            // delete category
            await handleDeleteCategory(parsedMessage.data as { category_id: string, organization_id: string });
            break;
          default:
            logger.error('Invalid action received', parsedMessage.action);
            break;
        }
        break;
      default:
        logger.error('Invalid type received', parsedMessage.type);
        break;
    }
  } catch (error) {
    logger.error('Error handling message [KAFKA]', error);
  }
};

export default resourceChangeHandler;
