import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AppEnv } from '../../config/env';
import { ENV_TOKEN } from '../../config/env';

/**
 * Uploaded image is stored in S3-compatible storage (MinIO for local dev).
 * The bucket is created + made publicly readable on module init so image URLs
 * returned by `upload()` are usable directly from the browser without signing.
 */
@Injectable()
export class MediaService implements OnModuleInit {
  private readonly log = new Logger(MediaService.name);
  private readonly s3: S3Client;

  constructor(@Inject(ENV_TOKEN) private readonly env: AppEnv) {
    this.s3 = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      // Path-style URLs are required by MinIO. AWS S3 accepts both.
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    await this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.env.S3_BUCKET }));
      return;
    } catch {
      // fall through to create
    }
    try {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.env.S3_BUCKET }));
      // Public-read policy so browsers can load uploaded images directly.
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.env.S3_BUCKET}/*`],
          },
        ],
      };
      await this.s3.send(
        new PutBucketPolicyCommand({
          Bucket: this.env.S3_BUCKET,
          Policy: JSON.stringify(policy),
        }),
      );
      this.log.log(`Created bucket '${this.env.S3_BUCKET}' with public-read policy`);
    } catch (e) {
      this.log.warn(
        `Could not ensure bucket '${this.env.S3_BUCKET}': ${(e as Error).message}. ` +
          `Uploads may fail until the bucket exists.`,
      );
    }
  }

  /**
   * Upload a single image to S3 and return its public URL.
   *   folder — logical subdirectory (e.g. 'products', 'categories')
   *   filename — original client-side filename, used only for the extension
   *   contentType — validated by controller before calling
   *   body — raw bytes
   */
  async uploadImage(input: {
    folder: string;
    filename: string;
    contentType: string;
    body: Buffer;
  }): Promise<{ url: string; key: string; contentType: string; size: number }> {
    const ext = extractExt(input.filename) || mimeToExt(input.contentType) || 'bin';
    const key = `${input.folder}/${today()}/${randomBytes(12).toString('hex')}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.env.S3_BUCKET,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return {
      url: `${this.env.S3_PUBLIC_URL}/${key}`,
      key,
      contentType: input.contentType,
      size: input.body.length,
    };
  }
}

function today(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function extractExt(filename: string): string | null {
  const m = filename.match(/\.([a-zA-Z0-9]{1,5})$/);
  return m ? m[1]!.toLowerCase() : null;
}

function mimeToExt(mime: string): string | null {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/avif':
      return 'avif';
    default:
      return null;
  }
}
