import logger from '../server/logging/logger';
import config from '../config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Get } from 's3-serve';
import { FileResult, FileUploadOptions, Storage, StorageType } from './Storage';

class S3Storage implements Storage {
  private s3: S3Client;
  private bucket: string;
  private region: string;
  private prefix: string;
  constructor() {
    logger.info('S3 constructor', { s3: config.s3 });
    this.bucket = config.s3.bucket;
    this.region = config.s3.region;
    this.prefix = config.s3.prefix;
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey, 
      },

      region: this.region,
    });
  }

  debug() {
    logger.debug('S3 debug', {
      s3: {
        bucket: this.bucket,
        region: this.region,
        prefix: this.prefix,
      }
    });
  }

  provide() {
    return StorageType.S3;
  }


  getLink(fileName: string) {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileName}`;
  }

  getKey(fileName: string, orgId?: string) {
    const timestamp = new Date().getTime();
    const baseKey = `${timestamp}/${fileName}`;
    
    if (!orgId) {
      return `${this.prefix}/${baseKey}`;
    }

    const key = `${this.prefix}/${orgId}/${baseKey}`;
    return key;
  }


  async uploadFile(file: Express.Multer.File, org_id: string, options?: FileUploadOptions): Promise<FileResult> {
    if (!org_id) {
      throw new Error('Organization ID is required');
    }
    this.debug();
    try {

      const key = this.getKey(options?.file_name || file.originalname, org_id);
      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
      };
      const command = new PutObjectCommand(params);
      const result = await this.s3.send(command);
      logger.info('result', result);
      return {
        path: key,
        key: key,
        url: this.getLink(key),
      }
    } catch (error) {
      // handle S3 error
      logger.error('Error uploading file', { error });
      throw error;
    }
  }

  async deleteFile(key: string) {
    const params = {
      Bucket: this.bucket,
      Key: key,
    };

    const command = new DeleteObjectCommand(params);
    await this.s3.send(command);
    return true;
  }

  async getFile(key: string) {
    const params = {
      Bucket: this.bucket,
      Key: key,
    };

    const data = await s3Get(this.s3, params);


    return data;
  }

  async downloadFile(key: string) {
    try {
      const args = {
        Bucket: this.bucket,
        Key: key,
      };
      logger.info('Download file ARGS', args);
      logger.info('this.s3', this.s3);
      const data = await s3Get(this.s3, args);
      return data;
    } catch (error) {
      logger.error('Error downloading file', { error });
      throw error;
    }
  }
}

export default S3Storage;