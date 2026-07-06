import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { loadEnv } from './config/env';

async function bootstrap() {
  const env = loadEnv();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      // Reuse the request id header that most reverse proxies inject; pino
      // will otherwise generate one. Having a stable ID makes logs traceable
      // end-to-end across the LB → API hop.
      requestIdHeader: 'x-request-id',
    }),
    { bufferLogs: true },
  );

  // Swap the default Nest console logger for pino. `bufferLogs: true` above
  // means messages during bootstrap flow through the pino logger too.
  app.useLogger(app.get(Logger));

  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCookie);
  await app.register(fastifyCors, {
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
  });
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,     // 5 MB — enforced again in MediaController
      files: 1,                       // single file per request
      fields: 5,                      // room for optional metadata fields
    },
  });

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  app.get(Logger).log(`API listening on http://0.0.0.0:${env.API_PORT}`, 'Bootstrap');
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
