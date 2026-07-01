import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// Cloudflare R2 (S3-compatible) storage for user-uploaded files (currently
// payment proofs). Config is env-driven and read lazily so the server can boot
// without R2 configured — the upload path throws a clear error only when used.
//
// R2_ENDPOINT is the S3 API endpoint (write path). R2_PUBLIC_URL is the public
// base for READING objects in a browser (the bucket's r2.dev URL or a custom
// domain) — it is NOT the same as R2_ENDPOINT. The bucket must be public-read.

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  const { R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY } = process.env;
  if (!R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    throw new Error(
      'R2 is not configured (need R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY).',
    );
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
    });
  }
  return cachedClient;
}

/** True when every R2 setting needed to upload AND serve a file is present. */
export function isR2Configured(): boolean {
  const { R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET, R2_PUBLIC_URL } =
    process.env;
  return Boolean(
    R2_ENDPOINT && R2_ACCESS_KEY && R2_SECRET_KEY && R2_BUCKET && R2_PUBLIC_URL,
  );
}

/**
 * Upload a buffer to R2 under `${keyPrefix}/<uuid>.<ext>` and return its public
 * URL (`${R2_PUBLIC_URL}/<key>`). Throws if R2 (incl. R2_PUBLIC_URL/R2_BUCKET)
 * is not configured, or on the underlying S3 error.
 */
export async function uploadBuffer(
  buffer: Buffer,
  contentType: string,
  keyPrefix: string,
): Promise<string> {
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!bucket) throw new Error('R2_BUCKET is not set.');
  if (!publicUrl) {
    throw new Error(
      'R2_PUBLIC_URL is not set — cannot build a public URL for the uploaded file.',
    );
  }
  const client = getClient();
  const ext = EXT_BY_TYPE[contentType] ?? 'bin';
  const key = `${keyPrefix}/${randomUUID()}.${ext}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return `${publicUrl.replace(/\/+$/, '')}/${key}`;
}
