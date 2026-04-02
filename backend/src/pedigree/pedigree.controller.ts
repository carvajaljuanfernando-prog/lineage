import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PedigreeService } from './pedigree.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Pedigrí Familiar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pedigree')
export class PedigreeController {
  constructor(private pedigreeService: PedigreeService) {}

  @Post('build/:tokenId')
  @ApiOperation({ summary: 'Generar pedigrí desde respuestas de encuesta' })
  build(@Param('tokenId') tokenId: string, @Request() req: any) {
    return this.pedigreeService.buildFromSurvey(tokenId, req.user.tenantId);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Obtener pedigrí de un paciente' })
  getTree(@Param('patientId') patientId: string, @Request() req: any) {
    return this.pedigreeService.getFamilyTree(patientId, req.user.tenantId);
  }

  @Put('member/:memberId')
  @ApiOperation({ summary: 'Editar miembro del pedigrí (corrección clínica)' })
  updateMember(
    @Param('memberId') memberId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.pedigreeService.updateMember(memberId, dto, req.user.tenantId);
  }
}
