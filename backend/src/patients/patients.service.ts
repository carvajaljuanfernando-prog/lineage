import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePatientDto, userId: string, tenantId: string) {
    const patient = await this.prisma.patient.create({
      data: {
        ...dto,
        tenantId,
        createdById: userId,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        patientId: patient.id,
        action: 'patient.created',
        entity: 'Patient',
        entityId: patient.id,
      },
    });

    return patient;
  }

  async findAll(tenantId: string, page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId, isActive: true };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { documentNum: { contains: search } },
      ];
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          surveyTokens: { select: { status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { surveyTokens: true } },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return { patients, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, tenantId, isActive: true },
      include: {
        createdBy: { select: { firstName: true, lastName: true, specialty: true } },
        surveyTokens: {
          orderBy: { createdAt: 'desc' },
          include: { template: { select: { name: true, category: true } } },
        },
        familyTree: { include: { members: true } },
        clinicalRecord: {
          include: {
            phenotypes: true,
            variants: { include: { reclassifications: true } },
          },
        },
      },
    });

    if (!patient) throw new NotFoundException('Paciente no encontrado');
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, tenantId: string, userId: string) {
    await this.assertBelongsToTenant(id, tenantId);
    const patient = await this.prisma.patient.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
    await this.prisma.auditLog.create({
      data: { userId, patientId: id, action: 'patient.updated', entity: 'Patient', entityId: id },
    });
    return patient;
  }

  async remove(id: string, tenantId: string, userId: string) {
    await this.assertBelongsToTenant(id, tenantId);
    await this.prisma.patient.update({ where: { id }, data: { isActive: false } });
    await this.prisma.auditLog.create({
      data: { userId, patientId: id, action: 'patient.deactivated', entity: 'Patient', entityId: id },
    });
    return { message: 'Paciente desactivado correctamente' };
  }

  private async assertBelongsToTenant(patientId: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new ForbiddenException('Acceso denegado');
  }
}
