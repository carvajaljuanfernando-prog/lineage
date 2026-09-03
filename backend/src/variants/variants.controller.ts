import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VariantsService } from './variants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Variantes Genéticas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('variants')
export class VariantsController {
  constructor(private variantsService: VariantsService) {}

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Listar variantes de un paciente' })
  list(@Param('patientId') patientId: string, @Request() req: any) {
    return this.variantsService.list(patientId, req.user.tenantId);
  }

  @Post('patient/:patientId')
  @ApiOperation({ summary: 'Registrar variante genética' })
  create(@Param('patientId') patientId: string, @Body() dto: any, @Request() req: any) {
    return this.variantsService.create(patientId, dto, req.user.tenantId, req.user.id);
  }

  @Put(':variantId')
  @ApiOperation({ summary: 'Actualizar o reclasificar variante' })
  update(@Param('variantId') variantId: string, @Body() dto: any, @Request() req: any) {
    return this.variantsService.update(variantId, dto, req.user.tenantId, req.user.id);
  }

  @Delete(':variantId')
  @ApiOperation({ summary: 'Eliminar variante' })
  remove(@Param('variantId') variantId: string, @Request() req: any) {
    return this.variantsService.remove(variantId, req.user.tenantId, req.user.id);
  }
}
