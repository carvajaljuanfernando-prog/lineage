import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios del centro clínico' })
  findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo usuario en el centro' })
  create(@Body() dto: any, @Request() req: any) {
    return this.usersService.create(dto, req.user.tenantId);
  }

  @Put(':id/role')
  @ApiOperation({ summary: 'Cambiar rol de un usuario' })
  updateRole(@Param('id') id: string, @Body() body: { role: string }, @Request() req: any) {
    return this.usersService.updateRole(id, body.role, req.user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar usuario' })
  deactivate(@Param('id') id: string, @Request() req: any) {
    return this.usersService.deactivate(id, req.user.tenantId);
  }
}
