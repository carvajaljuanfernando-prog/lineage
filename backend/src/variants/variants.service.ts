import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class VariantsService {
  constructor(private prisma: PrismaService) {}

  /** Obtiene (o crea) el registro clínico del paciente */
  private async getOrCreateRecord(patientId: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    let record = await this.prisma.clinicalRecord.findUnique({ where: { patientId } });
    if (!record) {
      record = await this.prisma.clinicalRecord.create({ data: { patientId } });
    }
    return record;
  }

  async list(patientId: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const record = await this.prisma.clinicalRecord.findUnique({
      where: { patientId },
      include: {
        variants: {
          orderBy: { createdAt: 'desc' },
          include: { reclassifications: { orderBy: { reclassifiedAt: 'desc' } } },
        },
      },
    });
    return record?.variants ?? [];
  }

  async create(patientId: string, dto: any, tenantId: string, userId: string) {
    const record = await this.getOrCreateRecord(patientId, tenantId);
    const esVUS = dto.classification === 'VUS';

    const variant = await this.prisma.geneticVariant.create({
      data: {
        clinicalRecordId: record.id,
        gene: dto.gene,
        transcriptId: dto.transcriptId || null,
        hgvsCoding: dto.hgvsCoding || null,
        hgvsProtein: dto.hgvsProtein || null,
        classification: dto.classification,
        zygosity: dto.zygosity || null,
        inheritancePattern: dto.inheritancePattern || null,
        clinvarId: dto.clinvarId || null,
        notes: dto.notes || null,
        isVUS: esVUS,
        // El seguimiento automático solo aplica a VUS
        trackingActive: esVUS ? dto.trackingActive !== false : false,
        nextCheckAt: esVUS ? this.enSeisMeses() : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId, patientId,
        action: 'variant.created',
        entity: 'GeneticVariant',
        entityId: variant.id,
        metadata: { gene: dto.gene, classification: dto.classification },
      },
    });

    return variant;
  }

  async update(variantId: string, dto: any, tenantId: string, userId: string) {
    const variant = await this.prisma.geneticVariant.findFirst({
      where: { id: variantId, clinicalRecord: { patient: { tenantId } } },
      include: { clinicalRecord: true },
    });
    if (!variant) throw new NotFoundException('Variante no encontrada');

    const nuevaClass = dto.classification ?? variant.classification;
    const esVUS = nuevaClass === 'VUS';
    const cambioClasificacion = nuevaClass !== variant.classification;

    // Si cambia la clasificación, se registra en el historial
    if (cambioClasificacion) {
      await this.prisma.vUSReclassification.create({
        data: {
          variantId,
          previousClass: variant.classification,
          newClass: nuevaClass,
          source: 'Manual',
          evidenceSummary: dto.reclassificationReason || 'Reclasificación manual por el equipo clínico',
        },
      });
    }

    const updated = await this.prisma.geneticVariant.update({
      where: { id: variantId },
      data: {
        gene: dto.gene ?? variant.gene,
        transcriptId: dto.transcriptId ?? variant.transcriptId,
        hgvsCoding: dto.hgvsCoding ?? variant.hgvsCoding,
        hgvsProtein: dto.hgvsProtein ?? variant.hgvsProtein,
        classification: nuevaClass,
        zygosity: dto.zygosity ?? variant.zygosity,
        inheritancePattern: dto.inheritancePattern ?? variant.inheritancePattern,
        clinvarId: dto.clinvarId ?? variant.clinvarId,
        notes: dto.notes ?? variant.notes,
        isVUS: esVUS,
        trackingActive: esVUS ? (dto.trackingActive ?? variant.trackingActive) : false,
        nextCheckAt: esVUS ? (variant.nextCheckAt ?? this.enSeisMeses()) : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        patientId: variant.clinicalRecord.patientId,
        action: cambioClasificacion ? 'variant.reclassified' : 'variant.updated',
        entity: 'GeneticVariant',
        entityId: variantId,
        metadata: cambioClasificacion
          ? { de: variant.classification, a: nuevaClass }
          : { gene: updated.gene },
      },
    });

    return updated;
  }

  async remove(variantId: string, tenantId: string, userId: string) {
    const variant = await this.prisma.geneticVariant.findFirst({
      where: { id: variantId, clinicalRecord: { patient: { tenantId } } },
      include: { clinicalRecord: true },
    });
    if (!variant) throw new NotFoundException('Variante no encontrada');

    await this.prisma.vUSReclassification.deleteMany({ where: { variantId } });
    await this.prisma.vUSExternalCheck.deleteMany({ where: { variantId } });
    await this.prisma.geneticVariant.delete({ where: { id: variantId } });

    await this.prisma.auditLog.create({
      data: {
        userId,
        patientId: variant.clinicalRecord.patientId,
        action: 'variant.deleted',
        entity: 'GeneticVariant',
        entityId: variantId,
        metadata: { gene: variant.gene },
      },
    });

    return { message: 'Variante eliminada' };
  }

  private enSeisMeses() {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d;
  }
}
