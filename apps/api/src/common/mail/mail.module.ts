import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Global so any module can inject MailService without adding it to imports.
 * Registered once at the app level in AppModule.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
