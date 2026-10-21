import { Global, Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';

@Global()
@Module({ providers: [SyncService], controllers: [SyncController], exports: [SyncService] })
export class SyncModule {}
