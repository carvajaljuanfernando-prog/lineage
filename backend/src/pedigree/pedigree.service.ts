import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PedigreeService {
  constructor(private prisma: PrismaService) {}

  // Build / rebuild family tree from completed survey responses
  async buildFromSurvey(tokenId: string, tenantId: string) {
    const token = await this.prisma.surveyToken.findFirst({
      where: { id: tokenId, patient: { tenantId } },
      include: { patient: true },
    });
    if (!token || !token.responses) throw new NotFoundException('Respuestas de encuesta no encontradas');

    const responses = token.responses as any;
    const members = this.parseResponsesToMembers(responses, token.patient);

    // Upsert family tree
    const existingTree = await this.prisma.familyTree.findUnique({
      where: { patientId: token.patientId },
    });

    if (existingTree) {
      // Delete old members and recreate
      await this.prisma.familyMember.deleteMany({ where: { familyTreeId: existingTree.id } });
      await this.prisma.familyTree.update({
        where: { id: existingTree.id },
        data: { members: { create: members } },
      });
      return this.prisma.familyTree.findUnique({
        where: { id: existingTree.id },
        include: { members: true },
      });
    } else {
      return this.prisma.familyTree.create({
        data: {
          patientId: token.patientId,
          members: { create: members },
        },
        include: { members: true },
      });
    }
  }

  async getFamilyTree(patientId: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const tree = await this.prisma.familyTree.findUnique({
      where: { patientId },
      include: { members: { orderBy: [{ generation: 'desc' }, { relationship: 'asc' }] } },
    });
    if (!tree) throw new NotFoundException('Pedigrí no generado aún. Complete la encuesta primero.');
    return tree;
  }

  async updateMember(memberId: string, dto: any, tenantId: string) {
    // Verify member belongs to patient in tenant
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyTree: { patient: { tenantId } } },
    });
    if (!member) throw new NotFoundException('Miembro familiar no encontrado');
    return this.prisma.familyMember.update({ where: { id: memberId }, data: dto });
  }

  // ── Helpers ────────────────────────────────────────────────
  private toDate(v: any): Date | null {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  private toInt(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = parseInt(String(v), 10);
    return isNaN(n) ? null : n;
  }

  // ── Parser: survey responses → FamilyMember records ────────
  private parseResponsesToMembers(responses: any, patient: any): any[] {
    const members: any[] = [];

    // Probando (patient index)
    members.push({
      relationship: 'proband',
      firstName: patient.firstName,
      lastName: patient.lastName,
      sex: patient.sex,
      dateOfBirth: patient.dateOfBirth,
      birthApprox: false,
      isAlive: true,
      hasCardiacHistory: false,
      generation: 0,
    });

    // Madre
    if (responses.madre?.nombre) {
      members.push({
        relationship: 'mother',
        firstName: responses.madre.nombre,
        sex: 'FEMALE',
        dateOfBirth: this.toDate(responses.madre.fechaNac),
        ageAtRecord: this.toInt(responses.madre.edad),
        birthApprox: responses.madre.fechaNacAprox === true,
        isAlive: responses.madre.vivo !== 'no',
        dateOfDeath: this.toDate(responses.madre.fechaMuerte),
        causeOfDeath: responses.madre.causaMuerte || null,
        ageAtDeath: this.toInt(responses.madre.edadMuerte),
        deathApprox: responses.madre.fechaMuerteAprox === true,
        hasCardiacHistory: responses.madre.problemasCorazon === 'si',
        cardiacDescription: responses.madre.descripcionCorazon || null,
        generation: 1,
      });
    }

    // Padre
    if (responses.padre?.nombre) {
      members.push({
        relationship: 'father',
        firstName: responses.padre.nombre,
        sex: 'MALE',
        dateOfBirth: this.toDate(responses.padre.fechaNac),
        ageAtRecord: this.toInt(responses.padre.edad),
        birthApprox: responses.padre.fechaNacAprox === true,
        isAlive: responses.padre.vivo !== 'no',
        dateOfDeath: this.toDate(responses.padre.fechaMuerte),
        causeOfDeath: responses.padre.causaMuerte || null,
        ageAtDeath: this.toInt(responses.padre.edadMuerte),
        deathApprox: responses.padre.fechaMuerteAprox === true,
        hasCardiacHistory: responses.padre.problemasCorazon === 'si',
        cardiacDescription: responses.padre.descripcionCorazon || null,
        generation: 1,
      });
    }

    // Hijos
    (responses.hijos || []).filter((h: any) => h.nombre).forEach((h: any) => {
      members.push({
        relationship: h.sexo === 'H' ? 'son' : 'daughter',
        firstName: h.nombre,
        sex: h.sexo === 'H' ? 'MALE' : 'FEMALE',
        dateOfBirth: this.toDate(h.fechaNac),
        ageAtRecord: this.toInt(h.edad),
        birthApprox: h.fechaNacAprox === true,
        isAlive: !h.fallecido,
        dateOfDeath: this.toDate(h.fechaMuerte),
        causeOfDeath: h.causaMuerte || null,
        ageAtDeath: this.toInt(h.edadMuerte),
        deathApprox: h.fechaMuerteAprox === true,
        hasCardiacHistory: h.problemaCardiaco === true,
        cardiacDescription: h.descripcionProblema || null,
        generation: -1,
      });
    });

    // Hermanos
    (responses.hermanos || []).filter((h: any) => h.nombre).forEach((h: any) => {
      members.push({
        relationship: h.sexo === 'H' ? 'brother' : 'sister',
        firstName: h.nombre,
        sex: h.sexo === 'H' ? 'MALE' : 'FEMALE',
        dateOfBirth: this.toDate(h.fechaNac),
        ageAtRecord: this.toInt(h.edad),
        birthApprox: h.fechaNacAprox === true,
        isAlive: !h.fallecido,
        dateOfDeath: this.toDate(h.fechaMuerte),
        causeOfDeath: h.causaMuerte || null,
        ageAtDeath: this.toInt(h.edadMuerte),
        deathApprox: h.fechaMuerteAprox === true,
        hasCardiacHistory: h.problemaCardiaco === true,
        cardiacDescription: h.descripcionProblema || null,
        generation: 0,
      });
    });

    // Abuelos maternos
    const abMat = responses.famMadre?.abuela;
    if (abMat?.nombre) {
      members.push({
        relationship: 'mat_grandmother',
        firstName: abMat.nombre,
        sex: 'FEMALE',
        dateOfBirth: this.toDate(abMat.fechaNac),
        ageAtRecord: this.toInt(abMat.edad),
        birthApprox: abMat.fechaNacAprox === true,
        isAlive: abMat.vivo !== 'no',
        dateOfDeath: this.toDate(abMat.fechaMuerte),
        ageAtDeath: this.toInt(abMat.edadMuerte),
        causeOfDeath: abMat.causaMuerte || null,
        deathApprox: abMat.fechaMuerteAprox === true,
        hasCardiacHistory: abMat.problemasCorazon === 'si',
        cardiacDescription: abMat.descripcionCorazon || null,
        generation: 2,
      });
    }
    const abMatP = responses.famMadre?.abuelo;
    if (abMatP?.nombre) {
      members.push({
        relationship: 'mat_grandfather',
        firstName: abMatP.nombre,
        sex: 'MALE',
        dateOfBirth: this.toDate(abMatP.fechaNac),
        ageAtRecord: this.toInt(abMatP.edad),
        birthApprox: abMatP.fechaNacAprox === true,
        isAlive: abMatP.vivo !== 'no',
        dateOfDeath: this.toDate(abMatP.fechaMuerte),
        ageAtDeath: this.toInt(abMatP.edadMuerte),
        causeOfDeath: abMatP.causaMuerte || null,
        deathApprox: abMatP.fechaMuerteAprox === true,
        hasCardiacHistory: abMatP.problemasCorazon === 'si',
        generation: 2,
      });
    }

    // Abuelos paternos
    const abPat = responses.famPadre?.abuela;
    if (abPat?.nombre) {
      members.push({
        relationship: 'pat_grandmother',
        firstName: abPat.nombre,
        sex: 'FEMALE',
        dateOfBirth: this.toDate(abPat.fechaNac),
        ageAtRecord: this.toInt(abPat.edad),
        birthApprox: abPat.fechaNacAprox === true,
        isAlive: abPat.vivo !== 'no',
        dateOfDeath: this.toDate(abPat.fechaMuerte),
        ageAtDeath: this.toInt(abPat.edadMuerte),
        causeOfDeath: abPat.causaMuerte || null,
        deathApprox: abPat.fechaMuerteAprox === true,
        hasCardiacHistory: abPat.problemasCorazon === 'si',
        generation: 2,
      });
    }
    const abPatP = responses.famPadre?.abuelo;
    if (abPatP?.nombre) {
      members.push({
        relationship: 'pat_grandfather',
        firstName: abPatP.nombre,
        sex: 'MALE',
        dateOfBirth: this.toDate(abPatP.fechaNac),
        ageAtRecord: this.toInt(abPatP.edad),
        birthApprox: abPatP.fechaNacAprox === true,
        isAlive: abPatP.vivo !== 'no',
        dateOfDeath: this.toDate(abPatP.fechaMuerte),
        ageAtDeath: this.toInt(abPatP.edadMuerte),
        causeOfDeath: abPatP.causaMuerte || null,
        deathApprox: abPatP.fechaMuerteAprox === true,
        hasCardiacHistory: abPatP.problemasCorazon === 'si',
        generation: 2,
      });
    }

    // Tíos maternos
    (responses.famMadre?.tios || []).filter((t: any) => t.nombre).forEach((t: any) => {
      members.push({
        relationship: t.sexo === 'H' ? 'mat_uncle' : 'mat_aunt',
        firstName: t.nombre,
        sex: t.sexo === 'H' ? 'MALE' : 'FEMALE',
        dateOfBirth: this.toDate(t.fechaNac),
        ageAtRecord: this.toInt(t.edad),
        birthApprox: t.fechaNacAprox === true,
        isAlive: !t.fallecido,
        dateOfDeath: this.toDate(t.fechaMuerte),
        causeOfDeath: t.causaMuerte || null,
        ageAtDeath: this.toInt(t.edadMuerte),
        deathApprox: t.fechaMuerteAprox === true,
        hasCardiacHistory: t.problemaCardiaco === true,
        cardiacDescription: t.descripcionProblema || null,
        generation: 1,
      });
    });

    // Tíos paternos
    (responses.famPadre?.tios || []).filter((t: any) => t.nombre).forEach((t: any) => {
      members.push({
        relationship: t.sexo === 'H' ? 'pat_uncle' : 'pat_aunt',
        firstName: t.nombre,
        sex: t.sexo === 'H' ? 'MALE' : 'FEMALE',
        dateOfBirth: this.toDate(t.fechaNac),
        ageAtRecord: this.toInt(t.edad),
        birthApprox: t.fechaNacAprox === true,
        isAlive: !t.fallecido,
        dateOfDeath: this.toDate(t.fechaMuerte),
        causeOfDeath: t.causaMuerte || null,
        ageAtDeath: this.toInt(t.edadMuerte),
        deathApprox: t.fechaMuerteAprox === true,
        hasCardiacHistory: t.problemaCardiaco === true,
        generation: 1,
      });
    });

    return members;
  }
}
