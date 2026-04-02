import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Lineage database…')

  // ── Global survey template: Cardiomiopatías Familiares ─────
  const cardiomyopathySchema = {
    sections: [
      {
        id: 'personal',
        title: 'Datos Personales',
        icon: '①',
        fields: [
          { id: 'apellidos', type: 'text', label: 'Apellidos', required: true },
          { id: 'nombre', type: 'text', label: 'Nombre(s)', required: true },
          { id: 'fechaNac', type: 'date', label: 'Fecha de nacimiento', required: true },
          { id: 'sexo', type: 'radio', label: 'Sexo', options: [{ value: 'H', label: 'Hombre' }, { value: 'M', label: 'Mujer' }], required: true },
          { id: 'estadoCivil', type: 'radio', label: 'Estado civil', options: ['Soltero/a','Casado/a','Separado/a','Divorciado/a','Viudo/a'].map(v => ({ value: v, label: v })) },
          { id: 'identificacion', type: 'text', label: 'N.º Identificación' },
          { id: 'direccion', type: 'text', label: 'Dirección' },
          { id: 'municipio', type: 'text', label: 'Municipio' },
          { id: 'departamento', type: 'text', label: 'Departamento' },
          { id: 'telefonoFijo', type: 'tel', label: 'Teléfono fijo' },
          { id: 'telefonoMovil', type: 'tel', label: 'Teléfono móvil' },
          { id: 'email', type: 'email', label: 'Correo electrónico' },
        ],
      },
      {
        id: 'hijos',
        title: 'Sus Hijos',
        icon: '②',
        repeatable: true,
        fields: [
          { id: 'nombre', type: 'text', label: 'Nombre completo' },
          { id: 'sexo', type: 'select', label: 'Sexo', options: [{ value: 'H', label: 'Hombre' }, { value: 'M', label: 'Mujer' }] },
          { id: 'fechaNac', type: 'date', label: 'Fecha de nacimiento' },
          { id: 'fallecido', type: 'radio_bool', label: '¿Ha fallecido?' },
          { id: 'causaMuerte', type: 'text', label: 'Causa de la muerte', condition: { field: 'fallecido', value: true } },
          { id: 'edadMuerte', type: 'number', label: 'Edad al fallecer', condition: { field: 'fallecido', value: true } },
          { id: 'problemaCardiaco', type: 'radio_bool', label: '¿Ha tenido problemas de corazón?' },
          { id: 'descripcionProblema', type: 'textarea', label: 'Describa el problema cardiaco', condition: { field: 'problemaCardiaco', value: true } },
        ],
      },
      {
        id: 'hermanos',
        title: 'Sus Hermanos y Hermanas',
        icon: '③',
        repeatable: true,
        fields: [
          { id: 'nombre', type: 'text', label: 'Nombre completo' },
          { id: 'sexo', type: 'select', label: 'Sexo', options: [{ value: 'H', label: 'Hombre' }, { value: 'M', label: 'Mujer' }] },
          { id: 'fechaNac', type: 'date', label: 'Fecha de nacimiento' },
          { id: 'medioHermano', type: 'checkbox', label: '¿Es medio hermano/a?' },
          { id: 'mismoProgenitor', type: 'select', label: '¿Comparten?', options: [{ value: 'madre', label: 'Misma madre' }, { value: 'padre', label: 'Mismo padre' }], condition: { field: 'medioHermano', value: true } },
          { id: 'fallecido', type: 'radio_bool', label: '¿Ha fallecido?' },
          { id: 'causaMuerte', type: 'text', label: 'Causa de la muerte', condition: { field: 'fallecido', value: true } },
          { id: 'problemaCardiaco', type: 'radio_bool', label: '¿Ha tenido problemas de corazón?' },
          { id: 'descripcionProblema', type: 'textarea', label: 'Describa el problema cardiaco', condition: { field: 'problemaCardiaco', value: true } },
        ],
      },
      { id: 'madre', title: 'Su Madre', icon: '④', personSection: true },
      { id: 'padre', title: 'Su Padre', icon: '⑤', personSection: true },
      {
        id: 'famMadre',
        title: 'Familia Materna',
        icon: '⑥',
        subSections: ['tios', 'abuela', 'abuelo', 'primos'],
      },
      {
        id: 'famPadre',
        title: 'Familia Paterna',
        icon: '⑦',
        subSections: ['tios', 'abuela', 'abuelo', 'primos'],
      },
    ],
  }

  await prisma.surveyTemplate.upsert({
    where: { slug: 'cardiomiopatias' } as any,
    update: {},
    create: {
      name: 'Cardiomiopatías Familiares',
      slug: 'cardiomiopatias',
      description: 'Encuesta estructurada de historia familiar para evaluación de sospecha de cardiomiopatía familiar. Cubre 4 generaciones con antecedentes cardiacos, causa de muerte y pedigrí.',
      category: 'CARDIOMYOPATHY',
      isGlobal: true,
      isActive: true,
      schema: cardiomyopathySchema,
    },
  })

  console.log('✅ Plantilla "Cardiomiopatías Familiares" creada')

  // ── Demo tenant + admin (development only) ─────────────────
  if (process.env.NODE_ENV !== 'production') {
    const demoTenantExists = await prisma.tenant.findUnique({ where: { slug: 'demo' } })
    if (!demoTenantExists) {
      const passwordHash = await bcrypt.hash('lineage2024', 12)
      await prisma.tenant.create({
        data: {
          name: 'Centro Demo — Lineage',
          slug: 'demo',
          country: 'CO',
          users: {
            create: {
              email: 'admin@lineage.demo',
              passwordHash,
              firstName: 'Admin',
              lastName: 'Demo',
              role: 'TENANT_ADMIN',
              specialty: 'Genética Médica',
            },
          },
        },
      })
      console.log('✅ Tenant demo creado: slug=demo, email=admin@lineage.demo, password=lineage2024')
    }
  }

  console.log('🌱 Seed completado')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
