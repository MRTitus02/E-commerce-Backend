import { randomUUID } from "crypto";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const minioEndpoint = process.env.MINIO_ENDPOINT ?? "localhost";
const minioPort = process.env.MINIO_PORT ?? "9000";
const minioUseSsl = (process.env.MINIO_USE_SSL ?? "false").toLowerCase() === "true";
const minioAccessKey = process.env.MINIO_ACCESS_KEY ?? process.env.MINIO_ROOT_USER ?? "minioadmin";
const minioSecretKey = process.env.MINIO_SECRET_KEY ?? process.env.MINIO_ROOT_PASSWORD ?? "minioadmin";
const minioBucket = process.env.MINIO_BUCKET ?? "product-images";
const minioPresignedExpirySeconds = Number(process.env.MINIO_PRESIGNED_EXPIRY_SECONDS ?? 900);
const minioPublicBaseUrl =
  process.env.MINIO_PUBLIC_BASE_URL ??
  `${minioUseSsl ? "https" : "http"}://${minioEndpoint}:${minioPort}`;

export const storageBucketName = minioBucket;

const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: `${minioUseSsl ? "https" : "http"}://${minioEndpoint}:${minioPort}`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: minioAccessKey,
    secretAccessKey: minioSecretKey,
  },
});

let bucketReadyPromise: Promise<void> | null = null;

function encodeObjectKeyForUrl(objectKey: string) {
  return objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildProductImageObjectKey(productId: string, fileName: string) {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `products/${productId}/${randomUUID()}-${safeFileName}`;
}

export function buildPublicObjectUrl(objectKey: string) {
  return `${minioPublicBaseUrl}/${storageBucketName}/${encodeObjectKeyForUrl(objectKey)}`;
}

async function ensureBucketExists() {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: storageBucketName }));
      } catch {
        await s3Client.send(new CreateBucketCommand({ Bucket: storageBucketName }));
      }

      await s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: storageBucketName,
          Policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "PublicReadObjects",
                Effect: "Allow",
                Principal: "*",
                Action: ["s3:GetObject"],
                Resource: [`arn:aws:s3:::${storageBucketName}/*`],
              },
            ],
          }),
        }),
      );
    })();
  }

  return bucketReadyPromise;
}

export async function createPresignedImageUpload(params: {
  objectKey: string;
  contentType: string;
}) {
  await ensureBucketExists();

  const command = new PutObjectCommand({
    Bucket: storageBucketName,
    Key: params.objectKey,
    ContentType: params.contentType,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: minioPresignedExpirySeconds,
  });

  return {
    url,
    method: "PUT" as const,
    headers: {
      "Content-Type": params.contentType,
    },
    expiresInSeconds: minioPresignedExpirySeconds,
  };
}

export async function assertObjectUploaded(objectKey: string) {
  await ensureBucketExists();

  await s3Client.send(
    new HeadObjectCommand({
      Bucket: storageBucketName,
      Key: objectKey,
    }),
  );
}
