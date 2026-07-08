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

/** Image subfolders — restricted to the image MIME whitelist + a small size cap. */
const IMAGE_FOLDERS = new Set(['products', 'categories', 'users', 'banners', 'posts']);

/**
 * Digital-deliverable subfolder. Accepts any content type (software, archives,
 * PDFs, keys, …) up to a larger size cap. Kept separate from image folders so a
 * misconfigured image field can never accept arbitrary binaries.
 */
const DIGITAL_FOLDER = 'digital';

const ALLOWED_FOLDERS = new Set([...IMAGE_FOLDERS, DIGITAL_FOLDER]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_DIGITAL_BYTES = 50 * 1024 * 1024; // 50 MB

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

    const isDigital = folder === DIGITAL_FOLDER;
    const maxBytes = isDigital ? MAX_DIGITAL_BYTES : MAX_IMAGE_BYTES;

    const file = await req.file({ limits: { fileSize: maxBytes } });
    if (!file) {
      throw new BadRequestException({
        code: 'NO_FILE',
        message: 'Expected a multipart file field named "file"',
      });
    }

    // Image folders are restricted to the image whitelist; the digital folder
    // accepts any content type.
    if (!isDigital && !ALLOWED_MIME.has(file.mimetype)) {
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
          message: `File exceeds ${Math.round(maxBytes / 1024 / 1024)} MB limit`,
        });
      }
      throw new BadRequestException({
        code: 'UPLOAD_FAILED',
        message: (e as Error).message,
      });
    }

    return this.media.uploadObject({
      folder,
      filename: file.filename,
      contentType: file.mimetype,
      body,
    });
  }
}
