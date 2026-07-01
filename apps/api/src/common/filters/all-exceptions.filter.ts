import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { fail } from '@ecom/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ status: (n: number) => { send: (b: unknown) => void } }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      code = this.codeFor(status);
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>;
        message = (b['message'] as string) ?? message;
        if (Array.isArray(b['message'])) {
          details = b['message'];
          message = code;
        }
        if (b['details'] !== undefined) details = b['details'];
        if (typeof b['code'] === 'string') code = b['code'] as string;
      }
    } else {
      const err = exception as Error;
      this.logger.error(err?.message ?? 'Unknown error', err?.stack);
    }

    res.status(status).send(fail(code, message, details));
  }

  private codeFor(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'UNPROCESSABLE_ENTITY';
      case 429: return 'TOO_MANY_REQUESTS';
      default:  return status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
    }
  }
}
