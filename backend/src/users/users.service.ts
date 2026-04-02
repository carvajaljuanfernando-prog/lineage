import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, specialty: true, lastLoginAt: true, createdAt: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async create(dto: any, tenantId: string) {
    const exists = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (exists) throw new ConflictException('Este correo ya está registrado en el centro');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: { ...dto, passwordHash, tenantId, password: undefined },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
  }

  async updateRole(userId: string, role: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.prisma.user.update({ where: { id: userId }, data: { role: role as any } });
  }

  async deactivate(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    return { message: 'Usuario desactivado' };
  }
}
