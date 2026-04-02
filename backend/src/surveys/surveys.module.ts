// surveys.module.ts
import { Module } from '@nestjs/common';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { PublicSurveyController } from './public-survey.controller';

@Module({
  controllers: [SurveysController, PublicSurveyController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
