import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import { getS3Client } from './s3_client.js';

export type InlineImageInput = {
  fileKey: string;
  mimeType: string;
};

export type InlineImagePart = {
  inlineData: {
    data: string;
    mimeType: string;
  };
};

const getS3Bucket = (): string | null =>
  process.env.AWS_S3_BUCKET ?? process.env.ARGUS_S3_BUCKET ?? null;

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const loadInlineImageParts = async (
  inputs: InlineImageInput[],
): Promise<InlineImagePart[]> => {
  if (inputs.length === 0) {
    return [];
  }

  const client = getS3Client();
  const bucket = getS3Bucket();

  if (!client || !bucket) {
    throw new Error('S3_NOT_CONFIGURED');
  }

  const parts: InlineImagePart[] = [];

  // Load sequentially for now; we can add concurrency later if needed.
  // eslint-disable-next-line no-restricted-syntax
  for (const input of inputs) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: input.fileKey,
      });
      const response = await client.send(command);
      const body = response.Body as Readable | null;
      if (!body) {
        // eslint-disable-next-line no-console
        console.warn(
          '[s3] GetObject returned empty Body for key:',
          input.fileKey,
        );
        continue;
      }
      const buffer = await streamToBuffer(body);
      const base64 = buffer.toString('base64');
      parts.push({
        inlineData: {
          data: base64,
          mimeType: input.mimeType,
        },
      });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error(
        '[s3] Failed to load inline image from S3:',
        input.fileKey,
        error,
      );
    }
  }

  return parts;
};

