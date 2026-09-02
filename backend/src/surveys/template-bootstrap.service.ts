// template-bootstrap.service.ts
// Crea la plantilla global "Cardiomiopatías Familiares" si no existe.
// Se ejecuta automáticamente al arrancar el backend (idempotente).
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TemplateBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(TemplateBootstrapService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const existing = await this.prisma.surveyTemplate.findFirst({
        where: { slug: 'cardiomiopatias', isGlobal: true },
      });
      if (existing) {
        this.logger.log('Plantilla global "Cardiomiopatías Familiares" ya existe');
        return;
      }
      await this.prisma.surveyTemplate.create({
        data: {
          name: 'Cardiomiopatías Familiares',
          slug: 'cardiomiopatias',
          description:
            'Encuesta estructurada de historia familiar para evaluación de sospecha de cardiomiopatía familiar. Cubre 4 generaciones con antecedentes cardiacos, causas de muerte y autopsias.',
          category: 'CARDIOMYOPATHY',
          isGlobal: true,
          isActive: true,
          schema: { version: 1, steps: ['intro', 'hijos', 'hermanos', 'madre', 'padre', 'famMadre', 'famPadre', 'revision'] },
        },
      });
      this.logger.log('✅ Plantilla global "Cardiomiopatías Familiares" creada');
    } catch (err) {
      this.logger.error('Error creando plantilla global', err as any);
    }
  }
}
