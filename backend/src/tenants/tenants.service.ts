// tenants.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async getMyTenant(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: { select: { users: true, patients: true } },
      },
    });
  }

  async updateTenant(tenantId: string, dto: any) {
    return this.prisma.tenant.update({ where: { id: tenantId }, data: dto });
  }

  // Super admin only
  async listAllTenants() {
    return this.prisma.tenant.findMany({
      include: { _count: { select: { users: true, patients: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
