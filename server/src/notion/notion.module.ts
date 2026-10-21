import { Global, Module } from '@nestjs/common';
import { NotionService } from './notion.service';
import { NotionController } from './notion.controller';

@Global()
@Module({ providers: [NotionService], controllers: [NotionController], exports: [NotionService] })
export class NotionModule {}
