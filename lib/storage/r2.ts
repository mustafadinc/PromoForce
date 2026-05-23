import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

function getR2Client() {
  if (client) return client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials missing. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env.local",
    );
  }

  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

function getBucket() {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set");
  return bucket;
}

export function getPublicAssetUrl(key: string) {
  const base = process.env.R2_PUBLIC_URL;
  if (base) return `${base.replace(/\/$/, "")}/${key}`;
  return null;
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<{ key: string; url: string | null }> {
  const s3 = getR2Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return { key, url: getPublicAssetUrl(key) };
}

export async function uploadDataUrlToR2(key: string, dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  return uploadToR2(key, buffer, contentType);
}

export async function getSignedR2Url(key: string, expiresIn = 3600) {
  const s3 = getR2Client();
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn },
  );
}

export async function deleteFromR2(key: string) {
  const s3 = getR2Client();
  await s3.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
}

export function buildAssetKey(workspaceId: string, postId: string, filename: string) {
  return `workspaces/${workspaceId}/posts/${postId}/${filename}`;
}
