import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Centro Clínico')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Información de mi centro clínico' })
  getMyTenant(@Request() req: any) {
    return this.tenantsService.getMyTenant(req.user.tenantId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Actualizar información del centro clínico' })
  update(@Body() dto: any, @Request() req: any) {
    return this.tenantsService.updateTenant(req.user.tenantId, dto);
  }
}
