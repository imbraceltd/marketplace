import { Message } from 'kafkajs';
import resourceChangeHandler from './handlers/resourceChangeHandler';

const kafkaHandlers: {
  [key: string]: (message: Message, partition?: number) => Promise<void>;
} = {
  RESOURCE_CHANGE: resourceChangeHandler,
};

export default kafkaHandlers;
