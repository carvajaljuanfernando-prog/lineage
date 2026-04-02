// surveys.controller.ts — Protected (clinical team)
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Encuestas — Equipo Clínico')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(private surveysService: SurveysService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Listar plantillas de encuesta disponibles' })
  getTemplates(@Request() req: any) {
    return this.surveysService.getTemplates(req.user.tenantId);
  }

  @Post('generate-token')
  @ApiOperation({ summary: 'Generar enlace de encuesta para un paciente' })
  generateToken(
    @Body() body: { patientId: string; templateId: string },
    @Request() req: any,
  ) {
    return this.surveysService.generateToken(
      body.patientId,
      body.templateId,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get('patient/:patientId/tokens')
  @ApiOperation({ summary: 'Ver historial de encuestas de un paciente' })
  getPatientTokens(@Param('patientId') patientId: string, @Request() req: any) {
    return this.surveysService.getPatientTokens(patientId, req.user.tenantId);
  }

  @Get('responses/:tokenId')
  @ApiOperation({ summary: 'Ver respuestas completadas para revisión clínica' })
  getResponses(@Param('tokenId') tokenId: string, @Request() req: any) {
    return this.surveysService.getResponses(tokenId, req.user.tenantId);
  }
}
