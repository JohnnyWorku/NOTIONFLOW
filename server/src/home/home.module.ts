import { Controller, Get, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EntitiesModule } from '../entities/entities.module';
import { HomeService } from './home.service';

@ApiTags('home')
@ApiBearerAuth()
@Controller('home')
class HomeController {
  constructor(private home: HomeService) {}
  @Get() get() { return this.home.get(); }
}

@Module({ imports: [EntitiesModule], providers: [HomeService], controllers: [HomeController] })
export class HomeModule {}
