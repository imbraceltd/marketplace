import logger from '../server/logging/logger';
// This is class to handle Kafka. init client, producer, consumer ...
import {
  Kafka,
  Producer,
  Consumer,
  Message,
  Partitioners,
  KafkaConfig,
} from 'kafkajs';
import { generateAuthToken } from 'aws-msk-iam-sasl-signer-js';
import config from '../config';
import kafkaHandlers from './incomingKafkaController';

const topics = ['RESOURCE_CHANGE'];

class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  private async oauthBearerTokenProvider(region: string) {
    try {
      // Uses AWS Default Credentials Provider Chain to fetch credentials
      const authTokenResponse = await generateAuthToken({ region });
      logger.info('======= AWS Kafka authTokenResponse:', authTokenResponse);
      return {
        value: authTokenResponse.token
      };
    } catch (error) {
      logger.error('Failed to generate AWS Kafka auth token:', error);
      throw error;
    }
  }

  constructor() {
    logger.info('======= Kafka Configuration:', {
      isAWSKafka: config.kafka.isAWSKafka,
      authMethod: config.kafka.kafka_aws_method,
      brokers: config.kafka.brokers,
      ssl: config.kafka.ssl,
      sasl: config.kafka.sasl,
    });

    const kafkaConfig: KafkaConfig = {
      clientId: config.kafka.clientId,
      brokers: config.kafka.isAWSKafka ? config.kafka.brokers[0]?.split(',') : config.kafka.brokers,
      ssl: config.kafka.ssl,
    };

    // Handle AWS MSK with IAM authentication
    if (config.kafka.isAWSKafka && config.kafka.kafka_aws_method === 'iam') {
      Object.assign(kafkaConfig, {
        ssl: true,
        sasl: {
          mechanism: 'oauthbearer',
          oauthBearerProvider: () => this.oauthBearerTokenProvider(config.kafka.kafka_aws_region),
        },
      });
    } else if (config.kafka.sasl) {
      // Handle regular SASL authentication
      Object.assign(kafkaConfig, {
        sasl: {
          mechanism: config.kafka.saslMechanism,
          username: config.kafka.saslUsername,
          password: config.kafka.saslPassword,
        },
      });
    }

    if (config.kafka.ssl && !config.kafka.isAWSKafka) {
      let ssl:
        | boolean
        | {
            rejectUnauthorized: boolean;
          } = true;
      if (!config.kafka.KAFKA_USE_SSL_REJECT_UNAUTHORIZED) {
        // ignore checking credentials
        ssl = {
          rejectUnauthorized: false,
        };
      }
      Object.assign(kafkaConfig, {
        ssl,
      });
    }

    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });
    this.consumer = this.kafka.consumer({ groupId: config.kafka.groupId });
  }

  async init() {
    await this.producer.connect();
    await this.run();
  }

  async initProducer() {
    await this.producer.connect();
  }

  async initConsumer() {
    await this.consumer.connect();
  }

  async send(topic: string, messages: Message[]) {
    try {
      logger.info('Sending message to kafka', { kafka: this.kafka });
      await this.initProducer();
      logger.info('Sending message to kafka', { topic, messages });
      await this.producer.send({
        topic,
        messages,
      });
      await this.producer.disconnect();
    } catch (error) {
      logger.error({ error });
    }
  }

  async run() {
    await this.initConsumer();

    // subscribe to topics
    await this.consumer.subscribe({ topics });

    // run the consumer
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        kafkaHandlers[topic](message, partition);
      },
    });
  }
}

// export singleton
// make sure that only one instance of kafkaService is exported
export default new KafkaService();
