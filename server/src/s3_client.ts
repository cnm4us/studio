import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

type S3Config = {
  region?: string;
  bucket?: string;
};

const getS3Config = (): S3Config => ({
  region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION,
  bucket: process.env.AWS_S3_BUCKET ?? process.env.ARGUS_S3_BUCKET,
});

let s3Client: S3Client | null = null;

export const getS3Client = (): S3Client | null => {
  const cfg = getS3Config();
  if (!cfg.region || !cfg.bucket) {
    return null;
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: cfg.region,
    });
    // eslint-disable-next-line no-console
    console.log(
      `[s3] S3 client initialized for region=${cfg.region}, bucket=${cfg.bucket}.`,
    );
  }

  return s3Client;
};

export const uploadImageToS3 = async (
  key: string,
  body: Buffer,
  contentType: string,
): Promise<{ key: string; url: string }> => {
  const cfg = getS3Config();
  const client = getS3Client();

  if (!client || !cfg.bucket || !cfg.region) {
    throw new Error('S3_NOT_CONFIGURED');
  }

  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);

  const cfDomain = process.env.CF_DOMAIN;
  const baseDomain = cfDomain && cfDomain.trim().length > 0
    ? cfDomain.trim()
    : `${cfg.bucket}.s3.${cfg.region}.amazonaws.com`;

  // Keys we generate use safe characters (`/`, letters, numbers, dots),
  // so we avoid encoding `/` to ensure S3/CloudFront paths resolve correctly.
  const url = `https://${baseDomain}/${key}`;

  return { key, url };
};
