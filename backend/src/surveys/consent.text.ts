// consent.text.ts
// Texto del consentimiento informado. Versionado: si cambia el texto, suba la versión.
// La versión aceptada queda registrada por paciente para trazabilidad legal.

export const CONSENT_VERSION = '1.0';

export interface ConsentContext {
  institucion: string;
  medico: string;
  especialidad?: string | null;
  encuesta: string;
}

export function buildConsentText(ctx: ConsentContext): string {
  const medico = ctx.especialidad ? `${ctx.medico} (${ctx.especialidad})` : ctx.medico;
  return `AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS PERSONALES SENSIBLES DE SALUD
Versión ${CONSENT_VERSION}

Responsable del tratamiento: ${ctx.institucion}
Profesional tratante: ${medico}
Instrumento: ${ctx.encuesta}

1. QUIÉN TRATA SUS DATOS
${ctx.institucion} es responsable del tratamiento de la información que usted registre en esta encuesta. El profesional ${medico} es quien lo ha vinculado a este proceso de valoración clínica.

2. QUÉ INFORMACIÓN SE RECOGE
Datos de identificación y contacto, y datos de salud suyos y de sus familiares: enfermedades del corazón, edades de diagnóstico, causas y edades de fallecimiento, y realización de autopsias.

3. PARA QUÉ SE USA
Su información se utiliza para elaborar su historia familiar y su árbol genealógico (pedigrí), apoyar el diagnóstico de enfermedades cardiacas hereditarias, orientar el estudio de familiares en riesgo y respaldar decisiones de tratamiento y seguimiento.

4. DATOS DE SUS FAMILIARES
Esta encuesta incluye información sobre la salud de sus familiares. Estos datos se recogen porque son indispensables para identificar enfermedades hereditarias que podrían afectarlo a usted y a su familia. Dicha información se maneja con la misma confidencialidad que la suya, se usa exclusivamente con fines de atención en salud y no se emplea para tomar decisiones sobre esos familiares sin su propio consentimiento. Al continuar, usted declara que aporta esta información de buena fe y según su mejor conocimiento.

5. SUS DERECHOS
Usted puede conocer, actualizar y rectificar sus datos; solicitar prueba de esta autorización; ser informado sobre el uso que se les ha dado; presentar quejas ante la Superintendencia de Industria y Comercio; y revocar esta autorización o solicitar la supresión de sus datos, salvo cuando exista un deber legal o contractual de conservarlos, como ocurre con la historia clínica. Para ejercerlos puede dirigirse a su profesional tratante o a ${ctx.institucion}.

6. CARÁCTER FACULTATIVO
Responder las preguntas sobre datos sensibles de salud es voluntario. Sin embargo, no aportar esta información puede limitar la capacidad del equipo médico de evaluar adecuadamente su riesgo cardiovascular hereditario y el de su familia.

7. CONSERVACIÓN Y SEGURIDAD
Su información se conserva mientras sea necesaria para su atención en salud y conforme a los plazos legales aplicables a la historia clínica. Se almacena de forma cifrada, con acceso restringido al personal clínico autorizado de ${ctx.institucion} y registro de auditoría de cada consulta.

8. AUTORIZACIÓN ADICIONAL PARA INVESTIGACIÓN (OPCIONAL)
De manera separada y voluntaria, usted puede autorizar el uso de sus datos ANONIMIZADOS —es decir, sin su nombre, documento ni ningún dato que permita identificarlo— con fines de investigación científica y docencia. Esta autorización es opcional: puede negarla y continuar con la encuesta sin ninguna consecuencia para su atención.

Marco legal: Ley 1581 de 2012, Decreto 1377 de 2013 y Ley 1266 de 2008 (República de Colombia).`;
}
