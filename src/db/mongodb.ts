import logger from '../server/logging/logger';
import { ServerApiVersion } from 'mongodb';
import mongoose, { ConnectOptions } from 'mongoose';
import config from '../config';

const dbName = config.mongoDB.dbName;
const mongoHost = config.mongoDB.host;
const mongoPort = config.mongoDB.port;
const username = config.mongoDB.username;
const password = config.mongoDB.password;
const isAtlas = config.mongoDB.isSrv;
const uri = isAtlas
  ? `mongodb+srv://${username}:${password}@${mongoHost}`
  : username && password
    ? `mongodb://${username}:${password}@${mongoHost}:${mongoPort}/${dbName}?directConnection=true&authSource=admin`
    //&replicaSet=rs0
    : `mongodb://${mongoHost}:${mongoPort}/${dbName}?authSource=admin&directConnection=true`;

const options: ConnectOptions = {
  dbName,
  auth: {
    username: username,
    password: password,
  },
  authMechanism: 'DEFAULT',
  retryWrites: true,
  w: 'majority',
  minPoolSize: 20,
  maxPoolSize: 100,
  serverApi: ServerApiVersion.v1,
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  heartbeatFrequencyMS: 1000
};

// Log the environment and URI for debugging purposes
// logger.info(`Environment: ${config.environment}`);
// logger.info('MongoDB URI:', uri);

mongoose.set('bufferTimeoutMS', 30000); // Increase buffer timeout

// Auto-connect removed
// mongoose.connect(uri, options).then(() => {
//   logger.info('MongoDB connected');
// }).catch((err) => {
//   logger.error('MongoDB connection error:', err);
// });

export async function connect() {
  return await mongoose.connect(uri, options);
}

export default mongoose.connection;
