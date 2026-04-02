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
        dateOfBirth: responses.madre.fechaNac ? new Date(responses.madre.fechaNac) : null,
        isAlive: responses.madre.vivo !== 'no',
        causeOfDeath: responses.madre.causaMuerte || null,
        ageAtDeath: responses.madre.edadMuerte ? parseInt(responses.madre.edadMuerte) : null,
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
        dateOfBirth: responses.padre.fechaNac ? new Date(responses.padre.fechaNac) : null,
        isAlive: responses.padre.vivo !== 'no',
        causeOfDeath: responses.padre.causaMuerte || null,
        ageAtDeath: responses.padre.edadMuerte ? parseInt(responses.padre.edadMuerte) : null,
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
        dateOfBirth: h.fechaNac ? new Date(h.fechaNac) : null,
        isAlive: !h.fallecido,
        causeOfDeath: h.causaMuerte || null,
        ageAtDeath: h.edadMuerte ? parseInt(h.edadMuerte) : null,
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
        dateOfBirth: h.fechaNac ? new Date(h.fechaNac) : null,
        isAlive: !h.fallecido,
        causeOfDeath: h.causaMuerte || null,
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
        dateOfBirth: abMat.fechaNac ? new Date(abMat.fechaNac) : null,
        isAlive: abMat.vivo !== 'no',
        causeOfDeath: abMat.causaMuerte || null,
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
        dateOfBirth: abMatP.fechaNac ? new Date(abMatP.fechaNac) : null,
        isAlive: abMatP.vivo !== 'no',
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
        isAlive: abPat.vivo !== 'no',
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
        isAlive: abPatP.vivo !== 'no',
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
        isAlive: !t.fallecido,
        causeOfDeath: t.causaMuerte || null,
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
        isAlive: !t.fallecido,
        hasCardiacHistory: t.problemaCardiaco === true,
        generation: 1,
      });
    });

    return members;
  }
}
