import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import config from '../../../config';
import _Error from '../../../utils/error';

const SIGNED_URL_EXPIRES = 3600;

let s3Client: S3Client | null = null;
const getS3Client = (): S3Client => {
    if (!s3Client) {
        s3Client = new S3Client({
            credentials: {
                accessKeyId: config.s3.accessKeyId,
                secretAccessKey: config.s3.secretAccessKey,
            },
            region: config.s3.region,
        });
    }
    return s3Client;
};

const buildKey = (orgId: string, templateId: string): string => {
    const prefix = config.s3.prefix || 'marketplace';
    const timestamp = Date.now();
    return `${prefix}/${orgId}/templates/${templateId}-${timestamp}.zip`;
};

const useLocalStorage = (): boolean => Boolean(config.use_local_storage);

const localBaseDir = (): string => {
    const base = config.file.path;
    if (!base) {
        throw new _Error('Local storage path (FILE_PATH) is not configured', 500);
    }
    return base;
};

export const uploadTemplateZip = async (
    orgId: string,
    templateId: string,
    buffer: Buffer,
): Promise<{ s3_key: string }> => {
    if (!orgId) throw new _Error('Organization ID is required', 400);
    if (!templateId) throw new _Error('Template ID is required', 400);

    const key = buildKey(orgId, templateId);

    if (useLocalStorage()) {
        const filePath = path.join(localBaseDir(), key);
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, buffer);
        return { s3_key: key };
    }

    await getS3Client().send(
        new PutObjectCommand({
            Bucket: config.s3.bucket,
            Key: key,
            Body: buffer,
            ContentType: 'application/zip',
        }),
    );
    return { s3_key: key };
};

export const getTemplateZipDownloadUrl = async (s3Key: string): Promise<string> => {
    if (!s3Key) throw new _Error('Missing s3 key', 400);

    if (useLocalStorage()) {
        const baseDomain = (config as any).domain || 'localhost';
        const protocol = baseDomain.startsWith('http') ? '' : 'http://';
        return `${protocol}${baseDomain}/market-places/templates/zip-content/${encodeURIComponent(s3Key)}`;
    }

    return await getSignedUrl(
        getS3Client(),
        new GetObjectCommand({
            Bucket: config.s3.bucket,
            Key: s3Key,
        }),
        { expiresIn: SIGNED_URL_EXPIRES },
    );
};

export const readTemplateZipBuffer = async (s3Key: string): Promise<Buffer> => {
    if (!s3Key) throw new _Error('Missing s3 key', 400);

    if (useLocalStorage()) {
        const filePath = path.join(localBaseDir(), s3Key);
        return await fs.promises.readFile(filePath);
    }

    const res = await getS3Client().send(
        new GetObjectCommand({
            Bucket: config.s3.bucket,
            Key: s3Key,
        }),
    );
    const body = res.Body as any;
    if (!body) throw new _Error('Empty object from S3', 500);

    if (typeof body.transformToByteArray === 'function') {
        const bytes: Uint8Array = await body.transformToByteArray();
        return Buffer.from(bytes);
    }

    return await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        body.on('data', (c: Buffer) => chunks.push(c));
        body.on('end', () => resolve(Buffer.concat(chunks)));
        body.on('error', reject);
    });
};
