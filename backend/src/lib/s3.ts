import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const S3_BUCKET = process.env.S3_BUCKET;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || "ru-1";

export const s3Client =
  S3_BUCKET && S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
    ? new S3Client({
        region: S3_REGION,
        endpoint: S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true,
      })
    : null;

export function getS3PublicUrl(key: string): string {
  if (!S3_BUCKET || !S3_ENDPOINT) {
    throw new Error("S3 is not configured");
  }

  if (process.env.S3_PUBLIC_URL) {
    return `${process.env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  }

  const base = `${S3_ENDPOINT.replace(/\/$/, "")}/${S3_BUCKET}`;
  return `${base}/${key}`;
}

export { PutObjectCommand };

