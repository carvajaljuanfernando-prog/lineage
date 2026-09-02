// public-survey.controller.ts — No auth (patient facing)
import { Controller, Get, Post, Put, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';

@ApiTags('Encuesta Paciente (Pública)')
@Controller('public/survey')
export class PublicSurveyController {
  constructor(private surveysService: SurveysService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Resolver token y cargar encuesta (vista paciente)' })
  resolve(@Param('token') token: string) {
    return this.surveysService.resolveToken(token);
  }

  @Post(':token/consent')
  @ApiOperation({ summary: 'Registrar aceptación del consentimiento informado' })
  consent(
    @Param('token') token: string,
    @Body() body: { fullName: string; documentNum: string; research: boolean },
    @Req() req: any,
  ) {
    const ip =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      null;
    const userAgent = (req.headers?.['user-agent'] as string) || null;
    return this.surveysService.acceptConsent(token, body, { ip, userAgent });
  }

  @Put(':token/progress')
  @ApiOperation({ summary: 'Guardar progreso de la encuesta (auto-save)' })
  saveProgress(@Param('token') token: string, @Body() body: { responses: any }) {
    return this.surveysService.saveProgress(token, body.responses);
  }

  @Post(':token/submit')
  @ApiOperation({ summary: 'Enviar encuesta completada' })
  submit(@Param('token') token: string, @Body() body: { responses: any }) {
    return this.surveysService.submitSurvey(token, body.responses);
  }
}
