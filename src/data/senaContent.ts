import { CompetencyDomain, InstitutionalVideosConfig } from '../types/sena';

export const DOMAIN_LABELS: Record<CompetencyDomain, string> = {
  identidad: 'Identidad SENA',
  derechosDeberes: 'Derechos, Deberes y Prohibiciones',
  debidoProceso: 'Debido Proceso y Faltas',
  etapaProductiva: 'Etapa Productiva y Novedades',
};

export interface SenaLevelDefinition {
  level: number;
  name: string;
  minXp: number;
  description: string;
}

export const SENA_LEVELS: SenaLevelDefinition[] = [
  {
    level: 1,
    name: 'Explorador SENA',
    minXp: 0,
    description: 'Iniciando el recorrido por la identidad y normas institucionales.',
  },
  {
    level: 2,
    name: 'Conocedor del Reglamento',
    minXp: 150,
    description: 'Comprende los deberes, derechos y rutas básicas del aprendiz.',
  },
  {
    level: 3,
    name: 'Aprendiz Íntegro',
    minXp: 350,
    description: 'Aplica criterios de debido proceso, ética y seguridad en el centro.',
  },
  {
    level: 4,
    name: 'Embajador SENA',
    minXp: 600,
    description: 'Domina la identidad institucional y el Reglamento del Aprendiz.',
  },
];

export interface SenaBadgeDefinition {
  id: string;
  title: string;
  criteria: string;
}

export const SENA_BADGES: SenaBadgeDefinition[] = [
  {
    id: 'identidad_viva',
    title: 'Identidad Viva',
    criteria: '100% de acierto en Identidad SENA.',
  },
  {
    id: 'guardian_deberes',
    title: 'Guardián de Deberes',
    criteria: '100% en Derechos, Deberes y Prohibiciones.',
  },
  {
    id: 'garante_proceso',
    title: 'Garante del Debido Proceso',
    criteria: '100% en Debido Proceso y Faltas.',
  },
  {
    id: 'ruta_productiva',
    title: 'Ruta Productiva',
    criteria: '100% en Etapa Productiva y Novedades.',
  },
  {
    id: 'apropiacion_integral',
    title: 'Apropiación Integral',
    criteria: 'Puntaje global igual o superior al 85%.',
  },
  {
    id: 'racha_imparable',
    title: 'Racha Imparable',
    criteria: '5 o más respuestas correctas consecutivas.',
  },
];

export function computeLevelFromXp(xpPoints: number): SenaLevelDefinition {
  let current = SENA_LEVELS[0];
  for (const lvl of SENA_LEVELS) {
    if (xpPoints >= lvl.minXp) {
      current = lvl;
    }
  }
  return current;
}

export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_\-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0] || '';
      return /^[a-zA-Z0-9_\-]{6,20}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_\-]{6,20}$/.test(vParam)) {
        return vParam;
      }
      const parts = parsed.pathname.split('/').filter(Boolean);
      const embedIdx = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'live');
      if (embedIdx >= 0 && parts[embedIdx + 1]) {
        const id = parts[embedIdx + 1];
        return /^[a-zA-Z0-9_\-]{6,20}$/.test(id) ? id : null;
      }
    }
  } catch {
    // Fallback regex
    const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_\-]{6,20})/);
    if (match && match[1]) return match[1];
  }

  return null;
}

export const DEFAULT_INSTITUTIONAL_VIDEOS: InstitutionalVideosConfig = {
  anthemVideoId: 'KD5wULG4PcY',
  anthemTitle: 'Himno del SENA · Servicio Nacional de Aprendizaje',
  anthemDescription:
    'Letra de Luis Alfredo Sarmiento y música de Daniel Marlez. Símbolo cultural que exalta el trabajo, la juventud y la formación para el progreso de Colombia.',
  institutionalVideoId: 'k4U-KjM8c3g',
  institutionalTitle: 'Presentación Institucional SENA · Legado y Misión',
  institutionalDescription:
    'Recorrido por el propósito social del SENA, su cobertura nacional y el impacto de la formación profesional integral gratuita.',
};

export const SENA_ANTHEM_STANZAS: { label: string; lines: string[] }[] = [
  {
    label: 'Coro',
    lines: [
      'Estudiantes del SENA, adelante',
      'por Colombia luchad con amor',
      'con el ánimo noble y radiante',
      'transformémosla en mundo mejor.',
    ],
  },
  {
    label: 'Estrofa I',
    lines: [
      'De la patria el futuro destino',
      'en las manos del joven está;',
      'el trabajo es seguro camino',
      'que el progreso a Colombia dará.',
    ],
  },
  {
    label: 'Estrofa II',
    lines: [
      'En la forja del SENA se forman',
      'hombres libres que anhelan triunfar,',
      'con la ciencia y la técnica unidas',
      'nuevos rumbos de paz trazarán.',
    ],
  },
  {
    label: 'Estrofa III',
    lines: [
      'Hoy la patria nos grita sentida:',
      '¡estudiantes del SENA, triunfad!',
      'solo así lograréis en la vida',
      'más justicia, mayor libertad.',
    ],
  },
];

export interface SenaSymbolItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  meaning: string[];
  appropriationTip: string;
}

export const SENA_SYMBOLS: SenaSymbolItem[] = [
  {
    id: 'escudo',
    title: 'El Escudo del SENA',
    category: 'Símbolo Institucional',
    summary:
      'Representa los tres sectores económicos en los que el SENA forma talento humano para el desarrollo de Colombia.',
    meaning: [
      'El piñón: simboliza el sector industrial y de manufactura tecnológica.',
      'El caduceo: representa el comercio, la logística y los servicios.',
      'El café: refleja el sector primario, agropecuario y extractivo.',
    ],
    appropriationTip:
      'Cuando portas el escudo en tu uniforme o carné, representas la articulación entre tu competencia técnica y el sector productivo nacional.',
  },
  {
    id: 'bandera',
    title: 'La Bandera Institucional',
    category: 'Símbolo Institucional',
    summary:
      'De fondo blanco con el escudo del SENA en el centro, expresa la vocación de paz, equidad y servicio público.',
    meaning: [
      'El color blanco representa la paz, la convivencia pacífica y la transparencia ética.',
      'En el centro lleva el escudo institucional como eje de unidad formativa.',
      'Preside los actos solemnes, certificaciones y ceremonias de inducción.',
    ],
    appropriationTip:
      'La bandera recuerda que la excelencia técnica debe ir siempre acompañada de convivencia respetuosa en los ambientes de aprendizaje.',
  },
  {
    id: 'logosimbolo',
    title: 'El Logo Símbolo',
    category: 'Identidad Visual',
    summary:
      'Muestra un sendero que converge hacia un horizonte y la figura humana en el centro del camino.',
    meaning: [
      'El sendero representa el proyecto de vida y el proceso continuo de aprendizaje.',
      'La figura humana simboliza al aprendiz como protagonista activo de su formación.',
      'Simboliza el lema institucional: aprender a aprender, aprender a hacer y aprender a ser.',
    ],
    appropriationTip:
      'El SENA te brinda las herramientas y ambientes, pero tú eres el motor de tu propio trayecto formativo.',
  },
  {
    id: 'himno',
    title: 'El Himno del SENA',
    category: 'Patrimonio Cultural',
    summary:
      'Canto institucional que exalta el trabajo digno, el estudio, la juventud y la construcción de patria.',
    meaning: [
      'Letra de Luis Alfredo Sarmiento y música de Daniel Marlez.',
      'Destaca la unión entre el esfuerzo académico, la ética y el progreso del país.',
      'Refuerza el sentido de pertenencia en ceremonias y encuentros de comunidad educativa.',
    ],
    appropriationTip:
      'Más allá de memorizar sus estrofas, su mensaje invita a asumir la formación gratuita como un compromiso social con el país.',
  },
];

export interface SenaEcosystemPillar {
  id: string;
  title: string;
  role: string;
  description: string;
  keyAction: string;
}

export const SENA_ECOSYSTEM: SenaEcosystemPillar[] = [
  {
    id: 'fpi',
    title: 'Formación Profesional Integral',
    role: 'Modelo Pedagógico',
    description:
      'Proceso educativo teórico-práctico basado en competencias que integra el saber, el hacer y el ser mediante proyectos formativos.',
    keyAction: 'Participa activamente en tu proyecto formativo y entrega evidencias oportunas.',
  },
  {
    id: 'plataformas',
    title: 'Sofía Plus y Zajuna (LMS)',
    role: 'Ecosistema Digital',
    description:
      'Sofía Plus gestiona tu matrícula, certificados y novedades; Zajuna aloja las guías de aprendizaje, foros y evidencias evaluativas.',
    keyAction: 'Verifica que tu correo registrado en Sofía Plus esté siempre activo y actualizado.',
  },
  {
    id: 'bienestar',
    title: 'Bienestar al Aprendiz',
    role: 'Acompañamiento Integral',
    description:
      'Ofrece apoyo psicosocial, deporte, cultura, liderazgo, monitorías y orientación hacia apoyos de sostenimiento.',
    keyAction: 'Acude a Bienestar cuando enfrentes dificultades personales o quieras potenciar tus talentos.',
  },
  {
    id: 'etapa-productiva',
    title: 'Etapa Productiva',
    role: 'Transición Laboral',
    description:
      'Fase en la que aplicas tus competencias en entornos reales mediante contrato de aprendizaje, vinculación laboral, proyecto productivo o pasantía.',
    keyAction: 'Prepara tu hoja de vida y mantén tus competencias al día desde la etapa lectiva.',
  },
];

export interface RegulationArticleGroup {
  id: string;
  chapter: string;
  title: string;
  reference: string;
  summary: string;
  points: string[];
  practicalExample: string;
}

export const REGULATION_CHAPTERS: RegulationArticleGroup[] = [
  {
    id: 'derechos',
    chapter: 'Capítulo II',
    title: 'Derechos del Aprendiz',
    reference: 'Acuerdo 00007 de 2012 · Art. 7',
    summary:
      'Garantías institucionales que protegen tu formación integral, dignidad, evaluación justa y participación.',
    points: [
      'Recibir formación profesional integral gratuita, acorde con el programa y diseño curricular.',
      'Ser tratado con respeto, equidad y sin discriminación por toda la comunidad educativa.',
      'Conocer oportunamente los resultados de sus evaluaciones y recibir retroalimentación.',
      'Gozar del debido proceso, derecho a la defensa y a presentar descargos ante cualquier proceso disciplinario.',
      'Acceder a servicios de Bienestar al Aprendiz y postularse a estímulos o monitorías.',
    ],
    practicalExample:
      'Si entregas una evidencia en Zajuna y no estás de acuerdo con la valoración, tienes derecho a solicitar revisión motivada ante tu instructor.',
  },
  {
    id: 'deberes',
    chapter: 'Capítulo III',
    title: 'Deberes del Aprendiz',
    reference: 'Acuerdo 00007 de 2012 · Art. 9',
    summary:
      'Compromisos académicos, convivenciales y de seguridad que aseguran ambientes de aprendizaje sanos y productivos.',
    points: [
      'Cumplir con todas las actividades del proceso formativo y asistir puntualmente.',
      'Portar el carné institucional y los Elementos de Protección Personal (EPP) en talleres y laboratorios.',
      'Cuidar y hacer uso racional de las instalaciones, equipos, herramientas y plataformas digitales.',
      'Justificar oportunamente las inasistencias dentro de los plazos establecidos y reportar novedades en Sofía Plus.',
      'Respetar los derechos de autor y citar adecuadamente las fuentes en todas las evidencias.',
    ],
    practicalExample:
      'En un taller de electricidad o soldadura, ingresar sin gafas ni calzado de seguridad incumple un deber directo de Seguridad y Salud en el Trabajo.',
  },
  {
    id: 'prohibiciones',
    chapter: 'Capítulo IV',
    title: 'Prohibiciones',
    reference: 'Acuerdo 00007 de 2012 · Art. 10',
    summary:
      'Conductas expresamente restringidas porque vulneran la integridad académica, la convivencia o los bienes públicos.',
    points: [
      'Plagiar documentos, presentar evidencias ajenas como propias o suplantar identidad en evaluaciones.',
      'Consumir, portar o distribuir sustancias psicoactivas o bebidas alcohólicas dentro del centro.',
      'Ingresar armas u objetos cortopunzantes que pongan en riesgo la integridad de la comunidad.',
      'Dañar intencionalmente maquinaria, mobiliario o infraestructura tecnológica del SENA.',
      'Acosar, agredir física o verbalmente, o difundir contenido ofensivo contra miembros de la comunidad.',
    ],
    practicalExample:
      'Copiar el código o informe de otro compañero y subirlo con tu nombre en Zajuna constituye fraude académico y falta grave o gravísima.',
  },
  {
    id: 'novedades',
    chapter: 'Capítulos V, VI y VII',
    title: 'Etapa Productiva, Novedades y Deserción',
    reference: 'Acuerdo 00007 de 2012 · Arts. 12–22',
    summary:
      'Reglas claras para gestionar traslados, aplazamientos, retiros voluntarios y evitar la deserción por inasistencia.',
    points: [
      'Inasistencia injustificada durante tres (3) días hábiles consecutivos puede configurar proceso de deserción.',
      'Si debes pausar tu formación por fuerza mayor, solicita Aplazamiento formal en Sofía Plus antes de ausentarte.',
      'El Retiro Voluntario formalizado evita sanciones de inhabilidad prolongada frente a futuras inscripciones.',
      'La Etapa Productiva exige seguimiento bimensual mediante bitácoras y concertación con el instructor de seguimiento.',
    ],
    practicalExample:
      'Un aprendiz con incapacidad médica o calamidad doméstica debe informar al instructor y radicar la novedad a tiempo en lugar de dejar de asistir.',
  },
  {
    id: 'debido-proceso',
    chapter: 'Capítulos VIII y IX',
    title: 'Faltas, Medidas Formativas y Debido Proceso',
    reference: 'Acuerdo 00007 de 2012 · Arts. 23–35',
    summary:
      'Toda falta se analiza bajo criterios objetivos ante el Comité de Evaluación y Seguimiento, garantizando la defensa.',
    points: [
      'Las faltas se dividen en Académicas y Disciplinarias, calificadas como Leves, Graves o Gravísimas.',
      'Medidas formativas: Llamado de atención verbal y Plan de Mejoramiento (académico o disciplinario).',
      'Sanciones: Llamado de atención escrito, Condicionamiento de matrícula y Cancelación de matrícula.',
      'El Comité de Evaluación y Seguimiento escucha descargos del aprendiz antes de recomendar una sanción al Subdirector.',
      'Contra el acto administrativo sancionatorio procede el recurso de reposición dentro de los términos legales.',
    ],
    practicalExample:
      'Ningún aprendiz puede ser sancionado con cancelación de matrícula sin citación previa, oportunidad de descargos y acto administrativo motivado.',
  },
];

export interface RegulationCase {
  id: string;
  title: string;
  context: string;
  scenario: string;
  correctType: 'Académica' | 'Disciplinaria';
  correctSeverity: 'Leve' | 'Grave' | 'Gravísima';
  correctMeasure: string;
  measureOptions: string[];
  legalExplanation: string;
  dueProcessStep: string;
}

export const REGULATION_CASES: RegulationCase[] = [
  {
    id: 'caso-plagio',
    title: 'Caso 01 · Evidencia duplicada en Zajuna',
    context: 'Ambiente virtual de aprendizaje · Etapa Lectiva',
    scenario:
      'Durante la revisión de la guía de proyecto, el instructor detecta que un aprendiz descargó el documento técnico de un compañero, cambió únicamente la portada y lo cargó como evidencia propia en la plataforma.',
    correctType: 'Académica',
    correctSeverity: 'Grave',
    correctMeasure: 'Plan de Mejoramiento y citación a Comité de Evaluación y Seguimiento',
    measureOptions: [
      'Expulsión inmediata sin derecho a descargos',
      'Plan de Mejoramiento y citación a Comité de Evaluación y Seguimiento',
      'Ignorar el hecho si el aprendiz promete no repetirlo',
    ],
    legalExplanation:
      'El plagio y la suplantación de autoría vulneran el Art. 10 (Prohibiciones) y el deber de honestidad académica. Al afectar la integridad de la evaluación, amerita reporte al Comité de Evaluación y Seguimiento para valorar la falta (generalmente Grave o Gravísima según reincidencia) y asignar plan de mejoramiento o sanción proporcional.',
    dueProcessStep:
      'Informe del instructor -> Citación formal al Comité -> Recepción de descargos del aprendiz -> Recomendación motivada al Subdirector.',
  },
  {
    id: 'caso-epp',
    title: 'Caso 02 · Incumplimiento de EPP en taller práctico',
    context: 'Taller de mantenimiento industrial · Seguridad y Salud en el Trabajo',
    scenario:
      'Un aprendiz ingresa por primera vez al taller sin gafas de protección ni botas dieléctricas pese a la instrucción previa de seguridad, argumentando que las olvidó en su casa.',
    correctType: 'Disciplinaria',
    correctSeverity: 'Leve',
    correctMeasure: 'Llamado de atención verbal preventivo y restricción de ingreso al área de riesgo',
    measureOptions: [
      'Cancelación inmediata de matrícula por primer olvido',
      'Llamado de atención verbal preventivo y restricción de ingreso al área de riesgo',
      'Permitirle operar maquinaria sin EPP bajo su propia firma',
    ],
    legalExplanation:
      'El uso de EPP es un deber obligatorio (Art. 9) para proteger la vida y la salud. Al ser un primer incidente sin daño causado, corresponde proteger al aprendiz impidiendo la exposición al riesgo y aplicar una medida formativa proporcional (llamado de atención verbal), escalando solo si hay reincidencia.',
    dueProcessStep:
      'Acción preventiva inmediata del instructor -> Registro pedagógico de seguimiento -> Plan de mejoramiento si persiste la conducta.',
  },
  {
    id: 'caso-inasistencia',
    title: 'Caso 03 · Ausencia consecutiva sin novedad reportada',
    context: 'Seguimiento de asistencia · Ficha presencial',
    scenario:
      'Un aprendiz acumula cuatro (4) días hábiles consecutivos sin asistir a formación ni responder mensajes, y tampoco registró solicitud de aplazamiento o incapacidad en Sofía Plus.',
    correctType: 'Académica',
    correctSeverity: 'Grave',
    correctMeasure: 'Requerimiento formal de justificación y eventual proceso de deserción',
    measureOptions: [
      'Requerimiento formal de justificación y eventual proceso de deserción',
      'Aprobación automática de resultados de aprendizaje por asistencia previa',
      'Sanción económica descontada del apoyo de sostenimiento',
    ],
    legalExplanation:
      'De acuerdo con el Reglamento (Art. 22), la inasistencia injustificada durante tres (3) días continuos o más activa el procedimiento de deserción. Sin embargo, antes de cancelar la matrícula, el SENA debe requerir formalmente al aprendiz para que aporte justificación o soporte válido dentro del término establecido.',
    dueProcessStep:
      'Verificación de asistencia -> Comunicación oficial al correo registrado -> Plazo para justificar o presentar novedad -> Acto de deserción si no responde.',
  },
  {
    id: 'caso-convivencia',
    title: 'Caso 04 · Agresión verbal e intimidación en ambiente formativo',
    context: 'Convivencia escolar · Trabajo colaborativo',
    scenario:
      'Tras una diferencia en la distribución de tareas de un proyecto, un aprendiz profiere amenazas e insultos graves contra un compañero frente al grupo, interrumpiendo la sesión formativa.',
    correctType: 'Disciplinaria',
    correctSeverity: 'Gravísima',
    correctMeasure: 'Reporte al Comité de Evaluación y Seguimiento para análisis de sanción disciplinaria',
    measureOptions: [
      'Suspender a ambos aprendices sin escuchar testimonios',
      'Reporte al Comité de Evaluación y Seguimiento para análisis de sanción disciplinaria',
      'Resolver el conflicto únicamente pidiendo que se den la mano',
    ],
    legalExplanation:
      'La agresión o intimidación vulnera directamente el derecho al trato digno y la prohibición de violencia en el centro. Por el daño convivencial, el instructor debe remitir informe detallado al Comité de Evaluación y Seguimiento (con apoyo de Bienestar al Aprendiz) para respetar el debido proceso y determinar la sanción.',
    dueProcessStep:
      'Informe objetivo con evidencias -> Acompañamiento de Bienestar -> Descargos ante el Comité -> Decisión motivada y derecho a recurso de reposición.',
  },
];

export interface EvaluationQuestion {
  id: string;
  domain: CompetencyDomain;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const EVALUATION_QUESTIONS: EvaluationQuestion[] = [
  {
    id: 'q-id-1',
    domain: 'identidad',
    prompt: '¿Qué representan los tres elementos del Escudo del SENA (piñón, caduceo y café)?',
    options: [
      'Las tres regiones geográficas principales de Colombia',
      'Los sectores industrial, de comercio/servicios y primario/agropecuario',
      'Los tres niveles de formación: operario, técnico y tecnólogo',
      'Los valores de puntualidad, disciplina y emprendimiento',
    ],
    correctIndex: 1,
    explanation:
      'El piñón representa la industria, el caduceo al comercio y los servicios, y el café al sector primario y extractivo.',
  },
  {
    id: 'q-id-2',
    domain: 'identidad',
    prompt: 'En el Logo Símbolo del SENA, ¿qué significa la figura humana en el centro del sendero?',
    options: [
      'El instructor como única autoridad que transmite conocimiento',
      'El aprendiz como protagonista activo de su proyecto de vida y formación',
      'El empresario que patrocina los contratos de aprendizaje',
      'La sede principal del Ministerio del Trabajo',
    ],
    correctIndex: 1,
    explanation:
      'El logo símbolo ubica al aprendiz como protagonista responsable de su propio camino de aprendizaje hacia el horizonte.',
  },
  {
    id: 'q-id-3',
    domain: 'identidad',
    prompt: '¿Cuál es el color principal de la bandera del SENA y qué simboliza?',
    options: [
      'Verde esmeralda, símbolo exclusivo de la agricultura',
      'Azul marino, símbolo de la tecnología digital',
      'Blanco con el escudo en el centro, símbolo de paz, libertad y tranquilidad',
      'Amarillo, símbolo de los recursos públicos del Estado',
    ],
    correctIndex: 2,
    explanation:
      'La bandera del SENA es blanca con el escudo en el centro, representando la paz, la libertad y la convivencia.',
  },
  {
    id: 'q-dd-1',
    domain: 'derechosDeberes',
    prompt: '¿Qué implica el deber del aprendiz SENA respecto al cumplimiento en los horarios de formación establecidos?',
    options: [
      'Asistir únicamente los días en que haya evaluaciones o entrega de evidencias',
      'Cumplir con puntualidad las sesiones presenciales y virtuales programadas y justificar oportunamente cualquier ausencia o retardo',
      'Ingresar a las sesiones de formación en cualquier momento sin necesidad de avisar al instructor',
      'Reemplazar las horas de clase faltantes con trabajo autónomo sin autorización previa',
    ],
    correctIndex: 1,
    explanation:
      'El Reglamento del Aprendiz (Art. 9) establece como deber asistir con puntualidad a todas las actividades de formación programadas y reportar o justificar oportunamente las inasistencias o retardos ante el instructor o coordinación.',
  },
  {
    id: 'q-dd-2',
    domain: 'derechosDeberes',
    prompt: 'Al ingresar a un taller o laboratorio con riesgos mecánicos o eléctricos, ¿qué deber prima para el aprendiz?',
    options: [
      'Portar y utilizar correctamente los Elementos de Protección Personal (EPP) asignados',
      'Grabar la práctica en redes sociales para documentar el proceso',
      'Operar cualquier máquina sin autorización previa del instructor',
      'Delegar el uso de protección únicamente al líder del grupo',
    ],
    correctIndex: 0,
    explanation:
      'Cumplir las normas de Seguridad y Salud en el Trabajo y portar los EPP es un deber irrenunciable (Art. 9).',
  },
  {
    id: 'q-dd-3',
    domain: 'derechosDeberes',
    prompt: 'Según el Artículo 10 del Reglamento, copiar el trabajo de un compañero y presentarlo como propio se clasifica como:',
    options: [
      'Una estrategia válida de aprendizaje colaborativo',
      'Un derecho de acceso libre a la información',
      'Una prohibición expresa por fraude y plagio académico',
      'Una falta que no tiene relación con el proceso formativo',
    ],
    correctIndex: 2,
    explanation:
      'El plagio o fraude en evidencias está expresamente prohibido en el Art. 10 del Reglamento del Aprendiz.',
  },
  {
    id: 'q-dp-1',
    domain: 'debidoProceso',
    prompt: '¿Cuál es el órgano colegiado encargado de analizar las faltas académicas o disciplinarias y escuchar los descargos del aprendiz?',
    options: [
      'La Junta Directiva de la empresa patrocinadora',
      'El Comité de Evaluación y Seguimiento',
      'La coordinación administrativa de vigilancia',
      'El grupo de WhatsApp de la ficha de formación',
    ],
    correctIndex: 1,
    explanation:
      'El Comité de Evaluación y Seguimiento garantiza el debido proceso, evalúa pruebas y escucha los descargos antes de recomendar medidas.',
  },
  {
    id: 'q-dp-2',
    domain: 'debidoProceso',
    prompt: '¿Qué diferencia existe entre una medida formativa y una sanción en el Reglamento del Aprendiz?',
    options: [
      'No existe diferencia; ambas implican expulsión del centro',
      'Las medidas formativas buscan reorientar el desempeño (ej. plan de mejoramiento), mientras las sanciones son correctivos formales ante faltas probadas',
      'Las sanciones se aplican sin citación, mientras las medidas formativas requieren acto presidencial',
      'Las medidas formativas solo aplican en etapa productiva',
    ],
    correctIndex: 1,
    explanation:
      'Las medidas formativas (llamado verbal, plan de mejoramiento) son pedagógicas; las sanciones (llamado escrito, condicionamiento, cancelación) requieren debido proceso completo.',
  },
  {
    id: 'q-dp-3',
    domain: 'debidoProceso',
    prompt: 'Si un aprendiz recibe un acto administrativo con sanción disciplinaria, ¿qué garantía constitucional y reglamentaria puede ejercer?',
    options: [
      'Presentar recurso de reposición dentro de los términos legales establecidos',
      'Borrar su registro en Sofía Plus y abrir otra cuenta',
      'Exigir el cambio inmediato del instructor sin argumento',
      'Ninguna, porque las decisiones no admiten revisión',
    ],
    correctIndex: 0,
    explanation:
      'El debido proceso incluye el derecho de contradicción y el recurso de reposición ante la autoridad que expidió el acto.',
  },
  {
    id: 'q-ep-1',
    domain: 'etapaProductiva',
    prompt: '¿Cuántos días hábiles consecutivos de inasistencia injustificada pueden activar un proceso de deserción en formación presencial?',
    options: [
      'Un (1) día hábil',
      'Tres (3) días hábiles consecutivos',
      'Quince (15) días calendario',
      'Treinta (30) días hábiles',
    ],
    correctIndex: 1,
    explanation:
      'El Reglamento establece que tres (3) días continuos de inasistencia injustificada activan el requerimiento formal por posible deserción.',
  },
  {
    id: 'q-ep-2',
    domain: 'etapaProductiva',
    prompt: 'Si un aprendiz enfrenta una situación médica o laboral grave que le impide continuar temporalmente, ¿cuál es el trámite correcto?',
    options: [
      'Dejar de asistir sin avisar para evitar trámites administrativos',
      'Solicitar formalmente el Aplazamiento mediante novedad en Sofía Plus con soporte',
      'Pedir a un compañero que firme la asistencia por él',
      'Esperar seis meses y regresar sin notificación',
    ],
    correctIndex: 1,
    explanation:
      'Tramitar el aplazamiento o retiro voluntario oportuno protege el historial del aprendiz y evita declaratoria de deserción.',
  },
  {
    id: 'q-ep-3',
    domain: 'etapaProductiva',
    prompt: '¿Cuál de las siguientes NO es una alternativa válida para desarrollar la Etapa Productiva en el SENA?',
    options: [
      'Contrato de aprendizaje',
      'Vinculación laboral o contractual relacionada con el programa',
      'Proyecto productivo o pasantía institucional avalada',
      'Pagar una tarifa para exonerar el requisito práctico',
    ],
    correctIndex: 3,
    explanation:
      'La etapa productiva es obligatoria y gratuita en su gestión; nunca puede sustituirse por pagos económicos.',
  },
];

export interface SensitizationDilemma {
  id: string;
  topic: string;
  regulationRef: string;
  title: string;
  prompt: string;
  options: string[];
  pedagogicalSynthesis: string;
}

export const SENSITIZATION_DILEMMAS: SensitizationDilemma[] = [
  {
    id: 'dil-1',
    topic: 'Honestidad Académica',
    regulationRef: 'Art. 9 y Art. 10 · Prohibición de plagio',
    title: 'El atajo de la entrega nocturna',
    prompt:
      'Faltan 20 minutos para cerrar la evidencia en Zajuna. Un compañero te ofrece enviarte su documento ya resuelto para que solo cambies el nombre y no pierdas la nota. ¿Qué postura asumes?',
    options: [
      'Acepto el archivo y lo subo igual para cumplir con la fecha límite.',
      'Rechazo copiarlo, pido orientación al instructor y entrego mi avance propio.',
      'Lo modifico con sinónimos para que no se note la similitud.',
      'No entrego nada y culpo a la plataforma de fallas técnicas.',
    ],
    pedagogicalSynthesis:
      'La formación por competencias busca que realmente domines el saber hacer. El fraude académico destruye la confianza profesional y acarrea proceso ante el Comité de Evaluación y Seguimiento.',
  },
  {
    id: 'dil-2',
    topic: 'Seguridad y Cuidado de la Vida',
    regulationRef: 'Principio "Primero la Vida" · Deberes SST',
    title: 'Presión de tiempo vs. Elementos de Protección',
    prompt:
      'En una práctica de taller, un compañero nota que sus gafas de seguridad están rayadas y decide trabajar sin ellas durante 10 minutos para terminar rápido. ¿Cuál debería ser tu reacción como equipo?',
    options: [
      'No intervengo porque cada aprendiz responde por sí mismo.',
      'Detenemos la tarea un minuto, avisamos al instructor y gestionamos gafas en buen estado.',
      'Le digo que trabaje rápido mirando hacia otro lado.',
      'Nos quitamos todos las gafas para trabajar en igualdad de condiciones.',
    ],
    pedagogicalSynthesis:
      'En el SENA el principio ético fundamental es "Primero la Vida". La seguridad industrial es corresponsabilidad de todo el equipo en el ambiente de formación.',
  },
  {
    id: 'dil-3',
    topic: 'Convivencia y Respeto',
    regulationRef: 'Cap. II y IV · Trato digno y convivencia',
    title: 'Burlas en el grupo de mensajería de la ficha',
    prompt:
      'Durante la semana de inducción, varios compañeros crean un chat alterno donde hacen memes burlescos de un aprendiz que preguntó varias veces cómo usar Sofía Plus. ¿Qué haces?',
    options: [
      'Me río en silencio para evitar conflictos con el grupo.',
      'Reenvío el mensaje a otros grupos porque es solo humor.',
      'Expreso desacuerdo con respeto, apoyo al compañero con la plataforma y promuevo un trato digno.',
      'Dejo de hablarle al aprendiz afectado para no quedar involucrado.',
    ],
    pedagogicalSynthesis:
      'La solidaridad y el respeto son valores institucionales SENA. El acoso digital también afecta la convivencia y puede configurar falta disciplinaria.',
  },
  {
    id: 'dil-4',
    topic: 'Comunicación Oportuna y Novedades',
    regulationRef: 'Art. 22 · Inasistencia y Deserción',
    title: 'Calamidad familiar durante la etapa lectiva',
    prompt:
      'Un aprendiz debe viajar de urgencia por enfermedad de un familiar durante una semana completa. ¿Cuál es la ruta reglamentaria correcta para proteger su cupo?',
    options: [
      'Irse sin avisar y explicar cuando regrese la semana siguiente.',
      'Pedir a un amigo que diga que está enfermo sin enviar soportes.',
      'Informar inmediatamente al instructor/coordinación y tramitar la justificación o aplazamiento en Sofía Plus.',
      'Cancelar su cuenta de correo institucional para que no le lleguen notificaciones.',
    ],
    pedagogicalSynthesis:
      'El silencio administrativo perjudica al aprendiz. Tres días consecutivos sin justificación activan deserción; comunicar a tiempo permite activar rutas de apoyo y Bienestar.',
  },
  {
    id: 'dil-5',
    topic: 'Cuidado de Bienes Públicos',
    regulationRef: 'Art. 9 · Cuidado de infraestructura y equipos',
    title: 'Falla en equipo de cómputo del ambiente',
    prompt:
      'Al encender una estación de trabajo del centro, notas que un cable de red está suelto y un compañero propone forzar el conector o cambiar piezas con otro computador sin avisar. ¿Qué decides?',
    options: [
      'Reportar la novedad al instructor antes de manipular el equipo para proteger el inventario y garantizar soporte.',
      'Cambiar las piezas en silencio para que no nos retrasen la clase.',
      'Usar otro equipo y dejar el dañado encendido para que culpen al siguiente grupo.',
      'Forzar el puerto hasta que entre a presión.',
    ],
    pedagogicalSynthesis:
      'La infraestructura del SENA es patrimonio público que beneficia a miles de colombianos gratuitamente. Cuidarla y reportar daños oportunamente es deber ciudadano y reglamentario.',
  },
  {
    id: 'dil-6',
    topic: 'Ética en Etapa Productiva',
    regulationRef: 'Cap. V · Desarrollo de Etapa Productiva',
    title: 'Confidencialidad de información en la empresa',
    prompt:
      'Ya en tu contrato de aprendizaje, tienes acceso a bases de datos de clientes de la empresa patrocinadora. Un conocido te pide los contactos para ofrecerles servicios propios. ¿Qué haces?',
    options: [
      'Comparto solo algunos correos porque no es un daño grande.',
      'Me niego categóricamente, explico el deber de confidencialidad y protejo la ética profesional.',
      'Le tomo foto a la pantalla para no dejar rastro digital.',
      'Le vendo la lista para complementar mi apoyo de sostenimiento.',
    ],
    pedagogicalSynthesis:
      'Tu desempeño en la etapa productiva representa la calidad ética del SENA ante el sector productivo. La deslealtad o fuga de datos puede causar terminación justa del contrato y cancelación de matrícula.',
  },
];
