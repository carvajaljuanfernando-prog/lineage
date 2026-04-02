import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Pacientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar nuevo paciente' })
  create(@Body() dto: CreatePatientDto, @Request() req: any) {
    return this.patientsService.create(dto, req.user.id, req.user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pacientes del centro clínico' })
  findAll(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.patientsService.findAll(req.user.tenantId, page, limit, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener paciente completo con historia clínica' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.patientsService.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos del paciente' })
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @Request() req: any) {
    return this.patientsService.update(id, dto, req.user.tenantId, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar paciente' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.patientsService.remove(id, req.user.tenantId, req.user.id);
  }
}
