import logger from '../server/logging/logger';
import { Readable } from 'stream';
import config from '../config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand  } from '@aws-sdk/client-s3';
import { s3Get } from 's3-serve';

class S3Handler {
  private s3: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    logger.info('S3 constructor', {s3: config.s3});
    this.bucket = config.s3.bucket;
    this.region = config.s3.region;
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },

      region: this.region,
    });
  }

  debug() {
    logger.debug('S3 debug', { s3: {
      bucket: this.bucket,
      region: this.region,
    } });
  }


  genLink(fileName: string) {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileName}`;
  }

  generateKey(fileName: string, father?: string) {
    const baseKey = `${new Date().getTime()}/${fileName}`;
    if (!father) {
      return baseKey;
    }

    const key = `${father}/${baseKey}`;

    return key;
  }


  async uploadFile(file: unknown, fileName: string) {

    this.debug();

    try {
      const params = {
        Bucket: this.bucket,
        Key: `${fileName}`,
        Body: file as Readable,
      };
      const command = new PutObjectCommand(params);
      const result = await this.s3.send(command);
      return result;
    } catch (error) {
      // handle S3 error
      logger.error('Error uploading file', { error });
      throw error;
    }
  }

  async deleteFile(fileName: string) {
    const params = {
      Bucket: this.bucket,
      Key: fileName,
    };

    const command = new DeleteObjectCommand(params);

    return await this.s3.send(command);
  }

  async getFile(fileName: string) {

    const params = {
      Bucket: this.bucket,
      Key: fileName,
    };

    const command = new GetObjectCommand(params);
    const result = await this.s3.send(command);

    return result;
  }

  async download(fileName: string) {
    const args = {
      Bucket: this.bucket,
      Key: fileName,
    };
    const data = await s3Get(this.s3, args);
    return data;
  }
}


const s3 = new S3Handler();
export default s3;