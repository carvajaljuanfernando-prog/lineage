// surveys.module.ts
import { Module } from '@nestjs/common';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { PublicSurveyController } from './public-survey.controller';
import { TemplateBootstrapService } from './template-bootstrap.service';

@Module({
  controllers: [SurveysController, PublicSurveyController],
  providers: [SurveysService, TemplateBootstrapService],
  exports: [SurveysService],
})
export class SurveysModule {}
