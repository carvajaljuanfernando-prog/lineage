import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SurveysService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // ── Generate one-time survey token for a patient ──────────
  async generateToken(patientId: string, templateId: string, tenantId: string, userId: string) {
    // Verify patient belongs to tenant
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    // Verify template exists and is active
    const template = await this.prisma.surveyTemplate.findFirst({
      where: { id: templateId, isActive: true },
    });
    if (!template) throw new NotFoundException('Plantilla de encuesta no encontrada');

    // Expire any existing pending tokens for same patient+template
    await this.prisma.surveyToken.updateMany({
      where: { patientId, templateId, status: { in: ['PENDING', 'SENT'] } },
      data: { status: 'EXPIRED' },
    });

    // Create new token — expires in 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const token = await this.prisma.surveyToken.create({
      data: { patientId, templateId, expiresAt, status: 'PENDING' },
      include: { template: true, patient: true },
    });

    // Audit
    await this.prisma.auditLog.create({
      data: {
        userId,
        patientId,
        action: 'survey.token_generated',
        entity: 'SurveyToken',
        entityId: token.id,
        metadata: { templateId, templateName: template.name },
      },
    });

    const surveyUrl = `${this.config.get('FRONTEND_URL')}/encuesta/${token.token}`;
    return { token: token.token, surveyUrl, expiresAt, patient, template };
  }

  // ── Public: resolve token (patient opens link) ─────────────
  async resolveToken(token: string) {
    const record = await this.prisma.surveyToken.findUnique({
      where: { token },
      include: { template: true, patient: { select: { firstName: true, sex: true } } },
    });

    if (!record) throw new NotFoundException('Enlace no válido');
    if (record.status === 'EXPIRED' || record.expiresAt < new Date()) {
      throw new BadRequestException('Este enlace ha expirado. Solicite uno nuevo al equipo médico.');
    }
    if (record.status === 'COMPLETED') {
      throw new BadRequestException('Esta encuesta ya fue completada.');
    }

    // Mark as opened
    if (record.status === 'PENDING' || record.status === 'SENT') {
      await this.prisma.surveyToken.update({
        where: { token },
        data: { status: 'IN_PROGRESS', openedAt: new Date() },
      });
    }

    return {
      tokenId: record.id,
      patientFirstName: record.patient.firstName,
      patientSex: record.patient.sex,
      template: record.template,
      existingResponses: record.responses,
    };
  }

  // ── Public: save progress (auto-save) ─────────────────────
  async saveProgress(token: string, responses: any) {
    const record = await this.prisma.surveyToken.findUnique({ where: { token } });
    if (!record || record.status === 'COMPLETED' || record.status === 'EXPIRED') {
      throw new BadRequestException('No se puede guardar en este enlace');
    }
    await this.prisma.surveyToken.update({
      where: { token },
      data: { responses, status: 'IN_PROGRESS' },
    });
    return { saved: true };
  }

  // ── Public: submit completed survey ───────────────────────
  async submitSurvey(token: string, responses: any) {
    const record = await this.prisma.surveyToken.findUnique({
      where: { token },
      include: { patient: true },
    });
    if (!record) throw new NotFoundException('Enlace no válido');
    if (record.status === 'COMPLETED') throw new BadRequestException('Ya fue enviada');
    if (record.expiresAt < new Date()) throw new BadRequestException('Enlace expirado');

    await this.prisma.surveyToken.update({
      where: { token },
      data: { responses, status: 'COMPLETED', completedAt: new Date() },
    });

    return { submitted: true, message: 'Gracias. Su información fue recibida exitosamente.' };
  }

  // ── Clinical: list tokens for a patient ───────────────────
  async getPatientTokens(patientId: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    return this.prisma.surveyToken.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { template: { select: { name: true, category: true } } },
    });
  }

  // ── Clinical: get completed responses for review ──────────
  async getResponses(tokenId: string, tenantId: string) {
    const token = await this.prisma.surveyToken.findFirst({
      where: { id: tokenId, patient: { tenantId } },
      include: { template: true, patient: true },
    });
    if (!token) throw new NotFoundException('Encuesta no encontrada');
    return token;
  }

  // ── Get all active templates ───────────────────────────────
  async getTemplates(tenantId: string) {
    return this.prisma.surveyTemplate.findMany({
      where: {
        isActive: true,
        OR: [{ isGlobal: true }, { tenantId }],
      },
      orderBy: { name: 'asc' },
    });
  }
}
