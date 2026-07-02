import { Module } from '@nestjs/common';
import { BlockTemplatesController } from './block-templates.controller';
import { BlockTemplatesService } from './block-templates.service';

@Module({
  controllers: [BlockTemplatesController],
  providers: [BlockTemplatesService],
  exports: [BlockTemplatesService],
})
export class BlockTemplatesModule {}
