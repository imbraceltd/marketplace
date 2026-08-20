import dotenv from 'dotenv';
dotenv.config();

const validateEnv = () => {
  const missing: string[] = [];

  const require = (key: string) => {
    if (!process.env[key]) missing.push(key);
  };

  // Always required
  require('BACKEND_HOST');
  require('CHANNEL_SERVICE_URL');

  // Database — must have MongoDB OR a typed DB
  const hasMongoHost = !!process.env.MONGODB_HOST || !!process.env.MONGODB_DB_NAME;
  const hasTypedDb = !!process.env.DB_TYPE;

  if (!hasMongoHost && !hasTypedDb) {
    console.error('[config] Missing database configuration: set MONGODB_HOST/MONGODB_DB_NAME or DB_TYPE');
    process.exit(1);
  }

  if (hasTypedDb) {
    if (process.env.DB_TYPE === 'postgres') {
      require('POSTGRES_HOST');
      require('POSTGRES_USER');
      require('POSTGRES_PASSWORD');
      require('POSTGRES_DB');
    } else if (process.env.DB_TYPE === 'mysql') {
      require('MYSQL_HOST');
      require('MYSQL_USER');
      require('MYSQL_PASSWORD');
      require('MYSQL_DB');
    }
  }

  if (missing.length > 0) {
    console.error('[config] Missing required environment variables:');
    missing.forEach((key) => console.error(`  ✗ ${key}`));
    process.exit(1);
  }

  console.log('[config] All required environment variables are present.');
};

validateEnv();


const config = {
  domain: process.env.DOMAIN || 'localhost:9982',
  mongoDB: {
    host: process.env.MONGODB_HOST || 'localhost',
    port: parseInt(process.env.MONGODB_PORT as string, 10) || '27017',
    dbName: process.env.MONGODB_DB_NAME || 'imbrace',
    username: process.env.MONGODB_USERNAME || undefined,
    password: process.env.MONGODB_PASSWORD || undefined,
    isSrv: process.env.MONGODB_SRV == 'true' || false,
  },
  hasMongoConfig: !!process.env.MONGODB_HOST || !!process.env.MONGODB_DB_NAME,
  dbType: process.env.DB_TYPE,
  postgres: {
    connectionString: `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB}${process.env.POSTGRES_SSL === 'true' ? '?sslmode=require' : ''}`,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'marketplaces',
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DB || 'marketplaces',
  },
  server: {
    port: parseInt(process.env.SERVER_PORT as string, 10) || 3000,
  },

  workflow: {
    host: process.env.WORKFLOW_HOST || 'localhost:5678',
    newHost: process.env.IPS_HOST || '',
  },
  ap_workflow: {
    host: process.env.AP_WORKFLOW_HOST || 'localhost:9983',
  },
  backend: {
    host: process.env.BACKEND_HOST || 'localhost:9981',
  },
  channelService: {
    host: process.env.CHANNEL_SERVICE_URL || '',
  },
  platform: {
    host: process.env.PLATFORM_HOST || 'localhost:6040',
  },
  ips: {
    host: process.env.IPS_HOST || '',
  },

  logLevel: process.env.LOG_LEVEL || 'debug',

  version: process.env.VERSION,

  environment: process.env.ENV || 'development',

  // AWS S3
  s3: {
    bucket: process.env.AWS_S3_BUCKET || 'imbrace',
    region: process.env.AWS_S3_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || '',
    prefix: process.env.AWS_BUCKET_PREFIX || 'marketplace',
  },

  // File
  file: {
    path: process.env.FILE_PATH ? `${process.env.FILE_PATH}` : null,
  },

  knowledgeHub: {
    host: process.env.KNOWLEDGE_HUB
  },

  use_local_storage: process.env.FILE_PATH && process.env.FILE_PATH !== '' ? true : false,

  // Kafka
  kafka: {
    brokers: process.env.KAFKA_ENDPOINT
      ? [process.env.KAFKA_ENDPOINT]
      : ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'local-backend',
    groupId: process.env.KAFKA_GROUP || 'local-backend',
    ssl: process.env.KAFKA_USE_SSL == 'true' || false,
    sasl: process.env.KAFKA_USE_SASL == 'true' || false,
    saslMechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
    saslUsername: process.env.KAFKA_SASL_USERNAME || '',
    saslPassword: process.env.KAFKA_SASL_PASSWORD || '',
    KAFKA_USE_SSL_REJECT_UNAUTHORIZED:
      process.env.KAFKA_USE_SSL_REJECT_UNAUTHORIZED == 'true' || false,
    isAWSKafka: process.env.KAFKA_IS_AWS_KAFKA == 'true' || false,
    kafka_aws_region: process.env.KAFKA_AWS_REGION || 'ap-east-1',
    kafka_aws_method: process.env.KAFKA_AWS_METHOD || 'iam',
  },

  // AI
  ai: {
    host: process.env.AI_SERVICE || 'http://localhost:7100',
    v2Host: process.env.AI_SERVICE_V2 || 'http://localhost:7100',
  },

  // Data Board service — target of cross-service cleanup (e.g. unlinking a
  // deleted assistant from doc-schema.agent_ids). The data-board host is
  // already provisioned per env as KNOWLEDGE_HUB; allow a dedicated
  // DATA_BOARD_HOST override but fall back to it so no new env is required.
  dataBoard: {
    host: process.env.DATA_BOARD_HOST || process.env.KNOWLEDGE_HUB || '',
  },

  facebookVerifyToken: process.env.FACEBOOK_VERIFY_TOKEN || 'your_verify_token',
};

console.log({ config });

export default config;
