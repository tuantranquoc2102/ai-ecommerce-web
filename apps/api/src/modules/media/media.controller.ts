import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { MediaService } from './media.service';

/** Whitelisted image MIME types. Extend cautiously — svg is intentionally excluded (XSS risk). */
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

/** Whitelisted subfolders. Prevents callers from writing to arbitrary S3 prefixes. */
const ALLOWED_FOLDERS = new Set(['products', 'categories', 'users', 'banners', 'posts']);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

interface FastifyRequestWithMultipart extends FastifyRequest {
  file(options?: unknown): Promise<MultipartFile | undefined>;
}

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /**
   * Multipart POST. Any authenticated user may upload — access to the resulting
   * URL is only useful if they also have permission to save it on a resource
   * (product/category/etc), which is guarded separately.
   *
   *   POST /api/v1/media/upload?folder=products
   *   Content-Type: multipart/form-data
   *   file: <the file>
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Req() req: FastifyRequestWithMultipart,
    @Query('folder') folderRaw?: string,
  ) {
    const folder = folderRaw ?? 'misc';
    if (!ALLOWED_FOLDERS.has(folder)) {
      throw new BadRequestException({
        code: 'INVALID_FOLDER',
        message: `folder must be one of: ${Array.from(ALLOWED_FOLDERS).join(', ')}`,
      });
    }

    const file = await req.file({ limits: { fileSize: MAX_BYTES } });
    if (!file) {
      throw new BadRequestException({
        code: 'NO_FILE',
        message: 'Expected a multipart file field named "file"',
      });
    }

    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException({
        code: 'INVALID_MIME',
        message: `Content-Type '${file.mimetype}' not allowed. Allowed: ${Array.from(ALLOWED_MIME).join(', ')}`,
      });
    }

    // toBuffer() throws if the file exceeded fileSize; catch to return a friendly error.
    let body: Buffer;
    try {
      body = await file.toBuffer();
    } catch (e) {
      if (file.file.truncated) {
        throw new BadRequestException({
          code: 'FILE_TOO_LARGE',
          message: `File exceeds ${Math.round(MAX_BYTES / 1024 / 1024)} MB limit`,
        });
      }
      throw new BadRequestException({
        code: 'UPLOAD_FAILED',
        message: (e as Error).message,
      });
    }

    return this.media.uploadImage({
      folder,
      filename: file.filename,
      contentType: file.mimetype,
      body,
    });
  }
}
