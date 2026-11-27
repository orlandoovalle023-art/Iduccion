import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Download,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  ArrowRight,
  Search,
  Users,
  Video,
  ClipboardList,
  Plus,
  Archive,
  RotateCcw,
  Trash2,
  LogIn,
  RefreshCw,
} from 'lucide-react';
import {
  DEFAULT_INSTITUTIONAL_VIDEOS,
  DOMAIN_LABELS,
  extractYoutubeVideoId,
} from '../data/senaContent';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import { sanitizeDisplayName, useAuth } from '../context/AuthContext';
import {
  AccessLog,
  CohortGroup,
  CohortJornada,
  CompetencyDomain,
  InstitutionalVideosConfig,
  KnowledgeEvaluation,
} from '../types/sena';
import { SenaLogo } from './SenaLogo';

interface InstructorDashboardProps {
  onGoToLiveSensitization: () => void;
}

type DashboardSubTab = 'analitica' | 'ingresos' | 'grupos' | 'videos';

const DOMAIN_RECOMMENDATIONS: Record<CompetencyDomain, string> = {
  identidad:
    'Reforzar la historia, símbolos (piñón, caduceo y café) y el sentido de pertenencia mediante recorrido por plataformas Sofía Plus y Zajuna.',
  derechosDeberes:
    'Trabajar casos prácticos de Seguridad y Salud en el Trabajo (uso obligatorio de EPP) y honestidad académica antes de asignar proyectos.',
  debidoProceso:
    'Simular una sesión del Comité de Evaluación y Seguimiento para aclarar faltas, medidas formativas, descargos y recurso de reposición.',
  etapaProductiva:
    'Explicar las alternativas de etapa productiva y el manejo oportuno de novedades (aplazamiento y justificación antes de 3 días de inasistencia).',
};

const JORNADA_OPTIONS: CohortJornada[] = [
  'Diurna',
  'Mixta',
  'Nocturna',
  'Fines de semana',
  'Virtual',
];

function getItemTimeMs(item: {
  createdAt?: { toMillis?: () => number };
  createdAtMs?: number;
}): number {
  return item.createdAt?.toMillis?.() ?? item.createdAtMs ?? 0;
}

function formatTimestamp(
  ts?: { toDate?: () => Date },
  ms?: number
): string {
  try {
    if (ts?.toDate) {
      return ts.toDate().toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (typeof ms === 'number' && Number.isFinite(ms)) {
      return new Date(ms).toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch {
    // Fallback
  }
  return 'Reciente';
}

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  onGoToLiveSensitization,
}) => {
  const {
    user,
    profile,
    isBootstrappedInstructor,
    isPasswordInstructor,
    instructorToken,
    instructorUsername,
    isInstructor,
    signIn,
  } = useAuth();

  const [activeSubTab, setActiveSubTab] =
    useState<DashboardSubTab>('analitica');

  // Evaluations state (merged Firestore + Server)
  const [firestoreEvaluations, setFirestoreEvaluations] = useState<
    KnowledgeEvaluation[]
  >([]);
  const [serverEvaluations, setServerEvaluations] = useState<
    KnowledgeEvaluation[]
  >([]);
  const [loadingFirestoreEvals, setLoadingFirestoreEvals] = useState(true);
  const [loadingServerEvals, setLoadingServerEvals] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fichaFilter, setFichaFilter] = useState('todas');
  const [deletingEvalId, setDeletingEvalId] = useState<string | null>(null);
  const [confirmDeleteAllEvals, setConfirmDeleteAllEvals] = useState(false);
  const [deletingAllEvals, setDeletingAllEvals] = useState(false);
  const [evalActionMessage, setEvalActionMessage] = useState<string | null>(null);

  // Access logs state (merged Firestore + Server)
  const [firestoreLogs, setFirestoreLogs] = useState<AccessLog[]>([]);
  const [serverLogs, setServerLogs] = useState<AccessLog[]>([]);
  const [loadingFirestoreLogs, setLoadingFirestoreLogs] = useState(true);
  const [loadingServerLogs, setLoadingServerLogs] = useState(true);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logFichaFilter, setLogFichaFilter] = useState('todas');

  // Cohorts state (merged Firestore + Server)
  const [firestoreCohorts, setFirestoreCohorts] = useState<CohortGroup[]>([]);
  const [serverCohorts, setServerCohorts] = useState<CohortGroup[]>([]);
  const [loadingFirestoreCohorts, setLoadingFirestoreCohorts] = useState(true);
  const [loadingServerCohorts, setLoadingServerCohorts] = useState(true);
  const [newFichaCode, setNewFichaCode] = useState('');
  const [newPrograma, setNewPrograma] = useState('');
  const [newJornada, setNewJornada] = useState<CohortJornada>('Diurna');
  const [savingCohort, setSavingCohort] = useState(false);
  const [cohortMessage, setCohortMessage] = useState<string | null>(null);
  const [cohortError, setCohortError] = useState<string | null>(null);

  // Videos configuration state
  const [anthemInput, setAnthemInput] = useState(
    DEFAULT_INSTITUTIONAL_VIDEOS.anthemVideoId
  );
  const [anthemTitle, setAnthemTitle] = useState(
    DEFAULT_INSTITUTIONAL_VIDEOS.anthemTitle
  );
  const [anthemDescription, setAnthemDescription] = useState(
    DEFAULT_INSTITUTIONAL_VIDEOS.anthemDescription
  );
  const [institutionalInput, setInstitutionalInput] = useState(
    DEFAULT_INSTITUTIONAL_VIDEOS.institutionalVideoId
  );
  const [institutionalTitle, setInstitutionalTitle] = useState(
    DEFAULT_INSTITUTIONAL_VIDEOS.institutionalTitle
  );
  const [institutionalDescription, setInstitutionalDescription] = useState(
    DEFAULT_INSTITUTIONAL_VIDEOS.institutionalDescription
  );
  const [savingVideos, setSavingVideos] = useState(false);
  const [videosMessage, setVideosMessage] = useState<string | null>(null);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [refreshingServer, setRefreshingServer] = useState(false);

  // Co-instructor state
  const [coInstructorUid, setCoInstructorUid] = useState('');
  const [coInstructorNote, setCoInstructorNote] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  const hasGoogleInstructor = Boolean(user && user.emailVerified && isInstructor);
  const instructorDisplayName = sanitizeDisplayName(
    profile?.displayName || user?.displayName || instructorUsername || 'Instructor SENA'
  );
  const instructorUidValue =
    user?.uid || `inst_${(instructorUsername || 'sena').replace(/[^a-zA-Z0-9_\-]/g, '')}`;

  const evaluations = useMemo(() => {
    const map = new Map<string, KnowledgeEvaluation>();
    serverEvaluations.forEach((ev) => {
      if (ev.id) map.set(ev.id, ev);
    });
    firestoreEvaluations.forEach((ev) => {
      if (ev.id) map.set(ev.id, ev);
    });
    return Array.from(map.values()).sort(
      (a, b) => getItemTimeMs(b) - getItemTimeMs(a)
    );
  }, [serverEvaluations, firestoreEvaluations]);

  const accessLogs = useMemo(() => {
    const map = new Map<string, AccessLog>();
    serverLogs.forEach((l) => {
      if (l.id) map.set(l.id, l);
    });
    firestoreLogs.forEach((l) => {
      if (l.id) map.set(l.id, l);
    });
    return Array.from(map.values()).sort(
      (a, b) => getItemTimeMs(b) - getItemTimeMs(a)
    );
  }, [serverLogs, firestoreLogs]);

  const cohorts = useMemo(() => {
    const map = new Map<string, CohortGroup>();
    serverCohorts.forEach((c) => map.set(c.fichaCode, c));
    firestoreCohorts.forEach((c) => map.set(c.fichaCode, c));
    return Array.from(map.values()).sort((a, b) =>
      a.fichaCode.localeCompare(b.fichaCode)
    );
  }, [serverCohorts, firestoreCohorts]);

  const loadingEvals = loadingFirestoreEvals && loadingServerEvals;
  const loadingLogs = loadingFirestoreLogs && loadingServerLogs;
  const loadingCohorts = loadingFirestoreCohorts && loadingServerCohorts;

  const fetchServerDashboardData = React.useCallback(async () => {
    if (!instructorToken) {
      setServerEvaluations([]);
      setServerLogs([]);
      setServerCohorts([]);
      setLoadingServerEvals(false);
      setLoadingServerLogs(false);
      setLoadingServerCohorts(false);
      return;
    }

    const headers = { Authorization: `Bearer ${instructorToken}` };
    try {
      const [evRes, logRes, cohRes, vidRes] = await Promise.all([
        fetch('/api/evaluations', { headers }),
        fetch('/api/access-logs', { headers }),
        fetch('/api/cohorts', { headers }),
        fetch('/api/videos'),
      ]);

      if (evRes.ok) {
        const data = (await evRes.json()) as {
          evaluations?: KnowledgeEvaluation[];
        };
        setServerEvaluations(
          Array.isArray(data.evaluations) ? data.evaluations : []
        );
      }
      if (logRes.ok) {
        const data = (await logRes.json()) as { logs?: AccessLog[] };
        setServerLogs(Array.isArray(data.logs) ? data.logs : []);
      }
      if (cohRes.ok) {
        const data = (await cohRes.json()) as { cohorts?: CohortGroup[] };
        setServerCohorts(Array.isArray(data.cohorts) ? data.cohorts : []);
      }
      if (vidRes.ok) {
        const data = (await vidRes.json()) as {
          videos?: Partial<InstitutionalVideosConfig> | null;
        };
        if (data.videos) {
          if (data.videos.anthemVideoId)
            setAnthemInput(data.videos.anthemVideoId);
          if (data.videos.anthemTitle) setAnthemTitle(data.videos.anthemTitle);
          if (data.videos.anthemDescription !== undefined)
            setAnthemDescription(data.videos.anthemDescription);
          if (data.videos.institutionalVideoId)
            setInstitutionalInput(data.videos.institutionalVideoId);
          if (data.videos.institutionalTitle)
            setInstitutionalTitle(data.videos.institutionalTitle);
          if (data.videos.institutionalDescription !== undefined)
            setInstitutionalDescription(data.videos.institutionalDescription);
        }
      }
    } catch {
      // Ignore network hiccup during polling
    } finally {
      setLoadingServerEvals(false);
      setLoadingServerLogs(false);
      setLoadingServerCohorts(false);
    }
  }, [instructorToken]);

  // Load & poll server data when authenticated with instructorToken
  useEffect(() => {
    if (!instructorToken) {
      setServerEvaluations([]);
      setServerLogs([]);
      setServerCohorts([]);
      setLoadingServerEvals(false);
      setLoadingServerLogs(false);
      setLoadingServerCohorts(false);
      return;
    }

    setLoadingServerEvals(true);
    setLoadingServerLogs(true);
    setLoadingServerCohorts(true);
    void fetchServerDashboardData();

    const interval = setInterval(() => {
      void fetchServerDashboardData();
    }, 5000);
    return () => clearInterval(interval);
  }, [instructorToken, fetchServerDashboardData]);

  // Subscribe to Firestore evaluations (when Google-authenticated)
  useEffect(() => {
    if (!user || !user.emailVerified || !isInstructor) {
      setFirestoreEvaluations([]);
      setLoadingFirestoreEvals(false);
      return;
    }

    const q = isBootstrappedInstructor
      ? query(collection(db, 'evaluations'), limit(200))
      : query(
          collection(db, 'evaluations'),
          where('uid', '==', user.uid),
          limit(50)
        );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as KnowledgeEvaluation),
        }));
        setFirestoreEvaluations(list);
        setLoadingFirestoreEvals(false);
      },
      (error) => {
        setLoadingFirestoreEvals(false);
        handleFirestoreError(error, OperationType.LIST, 'evaluations');
      }
    );

    return () => unsub();
  }, [user, isInstructor, isBootstrappedInstructor]);

  // Subscribe to Firestore access_logs (when Google-authenticated)
  useEffect(() => {
    if (!user || !user.emailVerified || !isInstructor) {
      setFirestoreLogs([]);
      setLoadingFirestoreLogs(false);
      return;
    }

    const q = isBootstrappedInstructor
      ? query(collection(db, 'access_logs'), limit(250))
      : query(
          collection(db, 'access_logs'),
          where('uid', '==', user.uid),
          limit(50)
        );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as AccessLog),
        }));
        setFirestoreLogs(list);
        setLoadingFirestoreLogs(false);
      },
      (error) => {
        setLoadingFirestoreLogs(false);
        handleFirestoreError(error, OperationType.LIST, 'access_logs');
      }
    );

    return () => unsub();
  }, [user, isInstructor, isBootstrappedInstructor]);

  // Subscribe to Firestore cohorts (when Google-authenticated)
  useEffect(() => {
    if (!user || !user.emailVerified || !isInstructor) {
      setFirestoreCohorts([]);
      setLoadingFirestoreCohorts(false);
      return;
    }

    const q = isBootstrappedInstructor
      ? query(collection(db, 'cohorts'), limit(100))
      : query(
          collection(db, 'cohorts'),
          where('instructorUid', '==', user.uid),
          limit(100)
        );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as CohortGroup);
        setFirestoreCohorts(list);
        setLoadingFirestoreCohorts(false);
      },
      (error) => {
        setLoadingFirestoreCohorts(false);
        handleFirestoreError(error, OperationType.LIST, 'cohorts');
      }
    );

    return () => unsub();
  }, [user, isInstructor, isBootstrappedInstructor]);

  // Subscribe to app_settings/videos
  useEffect(() => {
    if (!isInstructor) return;
    const unsub = onSnapshot(
      doc(db, 'app_settings', 'videos'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<InstitutionalVideosConfig>;
          if (data.anthemVideoId) setAnthemInput(data.anthemVideoId);
          if (data.anthemTitle) setAnthemTitle(data.anthemTitle);
          if (data.anthemDescription !== undefined)
            setAnthemDescription(data.anthemDescription);
          if (data.institutionalVideoId)
            setInstitutionalInput(data.institutionalVideoId);
          if (data.institutionalTitle)
            setInstitutionalTitle(data.institutionalTitle);
          if (data.institutionalDescription !== undefined)
            setInstitutionalDescription(data.institutionalDescription);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'app_settings/videos');
      }
    );
    return () => unsub();
  }, [isInstructor]);

  const uniqueFichas = useMemo(() => {
    const set = new Set([
      ...evaluations.map((e) => e.ficha),
      ...cohorts.map((c) => c.fichaCode),
    ]);
    return Array.from(set).sort();
  }, [evaluations, cohorts]);

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((ev) => {
      const matchesFicha = fichaFilter === 'todas' || ev.ficha === fichaFilter;
      const needle = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !needle ||
        ev.apprenticeName.toLowerCase().includes(needle) ||
        (ev.documentNumber || '').toLowerCase().includes(needle) ||
        ev.programa.toLowerCase().includes(needle) ||
        ev.ficha.toLowerCase().includes(needle);
      return matchesFicha && matchesSearch;
    });
  }, [evaluations, fichaFilter, searchTerm]);

  const analytics = useMemo(() => {
    if (filteredEvaluations.length === 0) {
      return {
        avgScore: 0,
        domainAverages: {
          identidad: 0,
          derechosDeberes: 0,
          debidoProceso: 0,
          etapaProductiva: 0,
        },
        weakestDomain: 'debidoProceso' as CompetencyDomain,
      };
    }

    let totalSum = 0;
    const domainSums: Record<CompetencyDomain, number> = {
      identidad: 0,
      derechosDeberes: 0,
      debidoProceso: 0,
      etapaProductiva: 0,
    };

    filteredEvaluations.forEach((ev) => {
      totalSum += ev.totalScore;
      domainSums.identidad += ev.domainScores.identidad;
      domainSums.derechosDeberes += ev.domainScores.derechosDeberes;
      domainSums.debidoProceso += ev.domainScores.debidoProceso;
      domainSums.etapaProductiva += ev.domainScores.etapaProductiva;
    });

    const n = filteredEvaluations.length;
    const domainAverages = {
      identidad: Math.round(domainSums.identidad / n),
      derechosDeberes: Math.round(domainSums.derechosDeberes / n),
      debidoProceso: Math.round(domainSums.debidoProceso / n),
      etapaProductiva: Math.round(domainSums.etapaProductiva / n),
    };

    const keys: CompetencyDomain[] = [
      'identidad',
      'derechosDeberes',
      'debidoProceso',
      'etapaProductiva',
    ];
    let weakest: CompetencyDomain = keys[0];
    keys.forEach((k) => {
      if (domainAverages[k] < domainAverages[weakest]) weakest = k;
    });

    return {
      avgScore: Math.round(totalSum / n),
      domainAverages,
      weakestDomain: weakest,
    };
  }, [filteredEvaluations]);

  // Cross-reference access_logs with evaluations
  const evaluationByUidFicha = useMemo(() => {
    const map = new Map<string, KnowledgeEvaluation>();
    evaluations.forEach((ev) => {
      const key = `${ev.uid}__${ev.ficha}`;
      const existing = map.get(key);
      if (!existing || ev.totalScore > existing.totalScore) {
        map.set(key, ev);
      }
    });
    return map;
  }, [evaluations]);

  const uniqueLogFichas = useMemo(() => {
    const set = new Set([
      ...accessLogs.map((l) => l.ficha),
      ...cohorts.map((c) => c.fichaCode),
    ]);
    return Array.from(set).sort();
  }, [accessLogs, cohorts]);

  const filteredLogs = useMemo(() => {
    return accessLogs.filter((log) => {
      const matchesFicha =
        logFichaFilter === 'todas' || log.ficha === logFichaFilter;
      const needle = logSearchTerm.trim().toLowerCase();
      const matchesSearch =
        !needle ||
        log.apprenticeName.toLowerCase().includes(needle) ||
        log.documentNumber.toLowerCase().includes(needle) ||
        log.ficha.toLowerCase().includes(needle) ||
        log.programa.toLowerCase().includes(needle);
      return matchesFicha && matchesSearch;
    });
  }, [accessLogs, logFichaFilter, logSearchTerm]);

  const handleExportEvaluationsCsv = () => {
    const headers = [
      'Aprendiz',
      'Documento',
      'Ficha',
      'Programa',
      'Modalidad',
      'Puntaje Total (%)',
      'XP Obtenidos',
      'Mejor Racha',
      'Identidad (%)',
      'Derechos y Deberes (%)',
      'Debido Proceso (%)',
      'Etapa Productiva (%)',
      'Area de Refuerzo',
    ];
    const rows = filteredEvaluations.map((ev) => [
      `"${ev.apprenticeName.replace(/"/g, '""')}"`,
      ev.documentNumber || 'PENDIENTE',
      ev.ficha,
      `"${ev.programa.replace(/"/g, '""')}"`,
      ev.mode,
      ev.totalScore,
      ev.xpEarned ?? 0,
      ev.bestStreak ?? 0,
      ev.domainScores.identidad,
      ev.domainScores.derechosDeberes,
      ev.domainScores.debidoProceso,
      ev.domainScores.etapaProductiva,
      `"${DOMAIN_LABELS[ev.weakestDomain as CompetencyDomain] || ev.weakestDomain}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `induccion_sena_evaluaciones_${fichaFilter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteEvaluation = async (evalId?: string) => {
    if (!evalId || !isInstructor) return;
    if (!hasGoogleInstructor && !instructorToken) return;
    setDeletingEvalId(evalId);
    setEvalActionMessage(null);
    const path = `evaluations/${evalId}`;
    try {
      let deletedCount = 0;
      if (instructorToken) {
        const res = await fetch(
          `/api/evaluations/${encodeURIComponent(evalId)}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${instructorToken}` },
          }
        );
        if (res.ok) {
          deletedCount += 1;
          setServerEvaluations((prev) => prev.filter((e) => e.id !== evalId));
        }
      }

      if (hasGoogleInstructor) {
        await deleteDoc(doc(db, 'evaluations', evalId));
        deletedCount += 1;
      }

      if (deletedCount > 0) {
        setEvalActionMessage('Evaluación eliminada correctamente.');
      } else {
        setEvalActionMessage('No se pudo localizar la evaluación en el servidor.');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setDeletingEvalId(null);
    }
  };

  const handleDeleteFilteredEvaluations = async () => {
    if (!isInstructor || filteredEvaluations.length === 0) return;
    if (!hasGoogleInstructor && !instructorToken) return;
    const targets = filteredEvaluations.filter((ev) => Boolean(ev.id));
    if (targets.length === 0) return;
    const targetIds = targets.map((ev) => ev.id!).filter(Boolean);

    setDeletingAllEvals(true);
    setEvalActionMessage(null);
    try {
      if (instructorToken && targetIds.length > 0) {
        const res = await fetch('/api/evaluations/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${instructorToken}`,
          },
          body: JSON.stringify({ ids: targetIds }),
        });
        if (res.ok) {
          const idSet = new Set(targetIds);
          setServerEvaluations((prev) =>
            prev.filter((e) => !e.id || !idSet.has(e.id))
          );
        }
      }

      if (hasGoogleInstructor) {
        for (let i = 0; i < targets.length; i += 450) {
          const chunk = targets.slice(i, i + 450);
          const batch = writeBatch(db);
          chunk.forEach((ev) => {
            if (ev.id) {
              batch.delete(doc(db, 'evaluations', ev.id));
            }
          });
          await batch.commit();
        }
      }

      setConfirmDeleteAllEvals(false);
      setEvalActionMessage(
        `Se eliminaron ${targets.length} evaluaciones registradas.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'evaluations');
    } finally {
      setDeletingAllEvals(false);
    }
  };

  const handleExportLogsCsv = () => {
    const headers = [
      'Aprendiz',
      'Tipo Documento',
      'Numero Documento',
      'Ficha',
      'Programa',
      'Evento',
      'Estado Evaluacion',
      'Fecha',
    ];
    const rows = filteredLogs.map((log) => {
      const matchedEval = evaluationByUidFicha.get(`${log.uid}__${log.ficha}`);
      const evalStatus = matchedEval
        ? `Evaluado (${matchedEval.totalScore}%)`
        : 'Solo ingreso';
      return [
        `"${log.apprenticeName.replace(/"/g, '""')}"`,
        log.documentType,
        log.documentNumber,
        log.ficha,
        `"${log.programa.replace(/"/g, '""')}"`,
        log.action === 'registro' ? 'Registro inicial' : 'Ingreso',
        evalStatus,
        `"${formatTimestamp(log.createdAt, log.createdAtMs)}"`,
      ];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `induccion_sena_ingresos_${logFichaFilter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInstructor || (!hasGoogleInstructor && !instructorToken)) return;
    setCohortError(null);
    setCohortMessage(null);

    const cleanCode = newFichaCode.replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 20);
    const cleanProg = newPrograma.trim().slice(0, 120);

    if (cleanCode.length < 4) {
      setCohortError(
        'El código de ficha debe tener al menos 4 caracteres alfanuméricos.'
      );
      return;
    }
    if (cleanProg.length < 3) {
      setCohortError('Ingresa el nombre del programa de formación.');
      return;
    }
    if (cohorts.some((c) => c.fichaCode === cleanCode)) {
      setCohortError(`La ficha ${cleanCode} ya está registrada.`);
      return;
    }

    setSavingCohort(true);
    const path = `cohorts/${cleanCode}`;
    try {
      if (instructorToken) {
        const res = await fetch('/api/cohorts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${instructorToken}`,
          },
          body: JSON.stringify({
            fichaCode: cleanCode,
            programa: cleanProg,
            jornada: newJornada,
            instructorName: instructorDisplayName,
          }),
        });
        const data = (await res.json()) as {
          cohort?: CohortGroup;
          error?: string;
        };
        if (!res.ok) {
          setCohortError(data.error || 'No se pudo guardar la ficha.');
          return;
        }
        if (data.cohort) {
          setServerCohorts((prev) => [...prev, data.cohort!]);
        }
      }

      if (hasGoogleInstructor && user) {
        await setDoc(doc(db, 'cohorts', cleanCode), {
          fichaCode: cleanCode,
          programa: cleanProg,
          jornada: newJornada,
          status: 'activa',
          instructorUid: user.uid,
          instructorName: instructorDisplayName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setNewFichaCode('');
      setNewPrograma('');
      setCohortMessage(`Ficha ${cleanCode} creada y habilitada para aprendices.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setSavingCohort(false);
    }
  };

  const handleToggleCohortStatus = async (cohort: CohortGroup) => {
    const nextStatus = cohort.status === 'activa' ? 'archivada' : 'activa';
    const path = `cohorts/${cohort.fichaCode}`;
    try {
      if (instructorToken) {
        const res = await fetch(
          `/api/cohorts/${encodeURIComponent(cohort.fichaCode)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${instructorToken}`,
            },
            body: JSON.stringify({ status: nextStatus }),
          }
        );
        if (res.ok) {
          const data = (await res.json()) as { cohort?: CohortGroup };
          if (data.cohort) {
            setServerCohorts((prev) =>
              prev.map((c) =>
                c.fichaCode === cohort.fichaCode ? data.cohort! : c
              )
            );
          }
        }
      }

      if (hasGoogleInstructor) {
        await updateDoc(doc(db, 'cohorts', cohort.fichaCode), {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleSaveVideos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInstructor || (!hasGoogleInstructor && !instructorToken)) return;
    setVideosError(null);
    setVideosMessage(null);

    const anthemId = extractYoutubeVideoId(anthemInput);
    const instId = extractYoutubeVideoId(institutionalInput);
    const cleanAnthemTitle = anthemTitle.trim().slice(0, 120);
    const cleanAnthemDesc = anthemDescription.trim().slice(0, 300);
    const cleanInstTitle = institutionalTitle.trim().slice(0, 120);
    const cleanInstDesc = institutionalDescription.trim().slice(0, 300);

    if (!anthemId || !instId) {
      setVideosError(
        'Ingresa un enlace o ID de YouTube válido (6 a 20 caracteres) para ambos videos.'
      );
      return;
    }
    if (cleanAnthemTitle.length < 3 || cleanInstTitle.length < 3) {
      setVideosError('El título de cada video debe tener al menos 3 caracteres.');
      return;
    }

    setSavingVideos(true);
    try {
      if (instructorToken) {
        const res = await fetch('/api/videos', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${instructorToken}`,
          },
          body: JSON.stringify({
            anthemVideoId: anthemId,
            anthemTitle: cleanAnthemTitle,
            anthemDescription: cleanAnthemDesc,
            institutionalVideoId: instId,
            institutionalTitle: cleanInstTitle,
            institutionalDescription: cleanInstDesc,
          }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setVideosError(data.error || 'No se pudieron actualizar los videos.');
          return;
        }
      }

      if (hasGoogleInstructor) {
        await setDoc(doc(db, 'app_settings', 'videos'), {
          anthemVideoId: anthemId,
          anthemTitle: cleanAnthemTitle,
          anthemDescription: cleanAnthemDesc,
          institutionalVideoId: instId,
          institutionalTitle: cleanInstTitle,
          institutionalDescription: cleanInstDesc,
          updatedBy: instructorUidValue,
          updatedAt: serverTimestamp(),
        });
      }

      setAnthemInput(anthemId);
      setInstitutionalInput(instId);
      setVideosMessage(
        'Videos institucionales actualizados en tiempo real para todos los aprendices.'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'app_settings/videos');
    } finally {
      setSavingVideos(false);
    }
  };

  const handleResetDefaultVideos = () => {
    setAnthemInput(DEFAULT_INSTITUTIONAL_VIDEOS.anthemVideoId);
    setAnthemTitle(DEFAULT_INSTITUTIONAL_VIDEOS.anthemTitle);
    setAnthemDescription(DEFAULT_INSTITUTIONAL_VIDEOS.anthemDescription);
    setInstitutionalInput(DEFAULT_INSTITUTIONAL_VIDEOS.institutionalVideoId);
    setInstitutionalTitle(DEFAULT_INSTITUTIONAL_VIDEOS.institutionalTitle);
    setInstitutionalDescription(
      DEFAULT_INSTITUTIONAL_VIDEOS.institutionalDescription
    );
    setVideosMessage(null);
    setVideosError(null);
  };

  const handleAddCoInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isBootstrappedInstructor) return;
    const cleanUid = coInstructorUid.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
    const cleanNote = coInstructorNote.trim().slice(0, 120);
    if (cleanUid.length < 4 || cleanNote.length < 2) {
      setAdminMessage('Ingresa un UID válido y una nota descriptiva.');
      return;
    }

    setAddingAdmin(true);
    setAdminMessage(null);
    const path = `admins/${cleanUid}`;
    try {
      await setDoc(doc(db, 'admins', cleanUid), {
        uid: cleanUid,
        note: cleanNote,
        addedBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setCoInstructorUid('');
      setCoInstructorNote('');
      setAdminMessage('Co-instructor autorizado correctamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setAddingAdmin(false);
    }
  };

  if (!isInstructor) return null;

  return (
    <section aria-labelledby="instructor-panel-heading" className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-start gap-4">
          <SenaLogo className="w-10 h-10 mt-1" />
          <div>
            <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-1.5">
              Panel del Instructor · Gestión Académica y Analítica
            </p>
            <h2
              id="instructor-panel-heading"
              className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight"
            >
              Seguimiento de grupos, ingresos y apropiación
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {instructorToken && (
            <button
              type="button"
              onClick={() => {
                setRefreshingServer(true);
                void fetchServerDashboardData().finally(() =>
                  setRefreshingServer(false)
                );
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshingServer ? 'animate-spin' : ''}`}
              />
              Actualizar
            </button>
          )}
          {isPasswordInstructor && !user?.emailVerified && (
            <button
              type="button"
              onClick={() => void signIn()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              Vincular Google (opcional)
            </button>
          )}
          <button
            type="button"
            onClick={onGoToLiveSensitization}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 transition-colors whitespace-nowrap"
          >
            Abrir Sensibilización en Vivo
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div
        role="tablist"
        aria-label="Secciones del panel instructor"
        className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit"
      >
        {(
          [
            ['analitica', 'Analítica y Brechas', BarChart3],
            ['ingresos', 'Registro de Ingresos', ClipboardList],
            ['grupos', 'Grupos y Fichas', Users],
            ['videos', 'Videos Institucionales', Video],
          ] as [DashboardSubTab, string, React.ElementType][]
        ).map(([tabId, label, Icon]) => {
          const active = activeSubTab === tabId;
          return (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveSubTab(tabId)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: ANALÍTICA Y BRECHAS */}
      {activeSubTab === 'analitica' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Evaluaciones registradas
              </p>
              <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                {filteredEvaluations.length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Promedio de apropiación
              </p>
              <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                {analytics.avgScore}%
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Ingresos registrados
              </p>
              <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                {accessLogs.length}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                Brecha prioritaria
              </p>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate mt-1">
                {filteredEvaluations.length > 0
                  ? DOMAIN_LABELS[analytics.weakestDomain]
                  : 'Sin registros aún'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <BarChart3 className="w-5 h-5 text-[#166534] dark:text-emerald-400" />
                <h3 className="text-lg font-semibold">
                  Nivel de apropiación por eje temático
                </h3>
              </div>

              {filteredEvaluations.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-6">
                  Aún no hay evaluaciones registradas para esta selección. Invita a tus aprendices a completar la evaluación en la pestaña Evaluación.
                </p>
              ) : (
                <div className="space-y-4">
                  {(Object.keys(DOMAIN_LABELS) as CompetencyDomain[]).map(
                    (key) => {
                      const value = analytics.domainAverages[key];
                      const low = value < 70;
                      return (
                        <div key={key} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {DOMAIN_LABELS[key]}
                            </span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums inline-flex items-center gap-1.5">
                              {low ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#166534] dark:text-emerald-400" />
                              )}
                              {value}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                low ? 'bg-amber-500' : 'bg-[#39A900]'
                              }`}
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-5">
              <div>
                <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-1.5">
                  Recomendación para mejorar la inducción
                </p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {filteredEvaluations.length > 0
                    ? `Priorizar refuerzo en ${DOMAIN_LABELS[analytics.weakestDomain]}`
                    : 'Plan de acción según resultados reales'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {filteredEvaluations.length > 0
                    ? DOMAIN_RECOMMENDATIONS[analytics.weakestDomain]
                    : 'Cuando tus aprendices completen la evaluación diagnóstica o integral, aquí aparecerán recomendaciones pedagógicas específicas según las brechas detectadas.'}
                </p>
              </div>

              {isBootstrappedInstructor && (
                <form
                  onSubmit={handleAddCoInstructor}
                  className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <UserPlus className="w-4 h-4 text-[#166534] dark:text-emerald-400" />
                    <span>Autorizar co-instructor de apoyo</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={coInstructorUid}
                      onChange={(e) => setCoInstructorUid(e.target.value)}
                      placeholder="UID del instructor"
                      className="px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={coInstructorNote}
                      onChange={(e) => setCoInstructorNote(e.target.value)}
                      placeholder="Nombre o centro"
                      className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="submit"
                      disabled={addingAdmin}
                      className="px-3.5 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap"
                    >
                      {addingAdmin ? 'Autorizando...' : 'Autorizar UID'}
                    </button>
                    {adminMessage && (
                      <span className="text-xs text-[#166534] dark:text-emerald-400">
                        {adminMessage}
                      </span>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Registro individual de evaluaciones
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Usa el botón Eliminar en cada fila para borrar una evaluación específica, o Eliminar evaluaciones para limpiar el filtro actual.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Aprendiz, doc. o ficha..."
                    className="pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                  />
                </div>

                <select
                  aria-label="Filtrar evaluaciones por ficha"
                  value={fichaFilter}
                  onChange={(e) => setFichaFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                >
                  <option value="todas">Todas las fichas</option>
                  {uniqueFichas.map((f) => (
                    <option key={f} value={f}>
                      Ficha {f}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleExportEvaluationsCsv}
                  disabled={filteredEvaluations.length === 0}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEvalActionMessage(null);
                    setConfirmDeleteAllEvals((prev) => !prev);
                  }}
                  disabled={filteredEvaluations.length === 0 || deletingAllEvals}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/70 text-red-700 dark:text-red-400 text-xs sm:text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar evaluaciones
                </button>
              </div>
            </div>

            {confirmDeleteAllEvals && filteredEvaluations.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/70 rounded-lg">
                <p className="text-xs sm:text-sm text-red-800 dark:text-red-200">
                  ¿Confirmas eliminar{' '}
                  <span className="font-semibold">
                    {filteredEvaluations.length}
                  </span>{' '}
                  {filteredEvaluations.length === 1
                    ? 'evaluación mostrada'
                    : 'evaluaciones mostradas'}
                  ? Esta acción borra los registros de la base de datos.
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAllEvals(false)}
                    disabled={deletingAllEvals}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteFilteredEvaluations()}
                    disabled={deletingAllEvals}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
                  >
                    {deletingAllEvals
                      ? 'Eliminando...'
                      : 'Confirmar eliminación'}
                  </button>
                </div>
              </div>
            )}

            {evalActionMessage && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#166534] dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 rounded-lg px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{evalActionMessage}</span>
              </div>
            )}

            {loadingEvals ? (
              <div className="space-y-2 py-4">
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ) : filteredEvaluations.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No se encontraron evaluaciones registradas con los filtros actuales.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 pr-4 font-medium">Aprendiz</th>
                      <th className="py-2.5 px-3 font-medium">Documento</th>
                      <th className="py-2.5 px-3 font-medium">Ficha</th>
                      <th className="py-2.5 px-3 font-medium">Modalidad</th>
                      <th className="py-2.5 px-3 font-medium text-right">
                        Identidad
                      </th>
                      <th className="py-2.5 px-3 font-medium text-right">
                        Derechos
                      </th>
                      <th className="py-2.5 px-3 font-medium text-right">
                        Proceso
                      </th>
                      <th className="py-2.5 px-3 font-medium text-right">
                        Etapa P.
                      </th>
                      <th className="py-2.5 px-3 font-medium text-right">XP</th>
                      <th className="py-2.5 px-3 font-medium text-right">
                        Global
                      </th>
                      <th className="py-2.5 pl-3 font-medium text-right sticky right-0 bg-white dark:bg-slate-900">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                    {filteredEvaluations.map((ev) => (
                      <tr
                        key={ev.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                          {ev.apprenticeName}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          {ev.documentNumber || 'PENDIENTE'}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          {ev.ficha}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400">
                          {ev.mode === 'diagnostico'
                            ? 'Diagnóstico'
                            : 'Integral'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                          {ev.domainScores.identidad}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                          {ev.domainScores.derechosDeberes}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                          {ev.domainScores.debidoProceso}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                          {ev.domainScores.etapaProductiva}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-[#166534] dark:text-emerald-400 tabular-nums">
                          +{ev.xpEarned ?? 0}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {ev.totalScore}%
                        </td>
                        <td className="py-3 pl-3 text-right sticky right-0 bg-white dark:bg-slate-900">
                          <button
                            type="button"
                            onClick={() => void handleDeleteEvaluation(ev.id)}
                            disabled={deletingEvalId === ev.id || deletingAllEvals}
                            aria-label={`Eliminar evaluación de ${ev.apprenticeName}`}
                            title="Eliminar esta evaluación"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/70 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 transition-colors whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {deletingEvalId === ev.id ? 'Borrando...' : 'Eliminar'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REGISTRO DE INGRESOS */}
      {activeSubTab === 'ingresos' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Bitácora de ingresos y registros por ficha
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Controla qué aprendices ingresaron con su documento y si ya completaron su evaluación de conocimientos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logSearchTerm}
                  onChange={(e) => setLogSearchTerm(e.target.value)}
                  placeholder="Nombre o documento..."
                  className="pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                />
              </div>

              <select
                aria-label="Filtrar ingresos por ficha"
                value={logFichaFilter}
                onChange={(e) => setLogFichaFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
              >
                <option value="todas">Todas las fichas</option>
                {uniqueLogFichas.map((f) => (
                  <option key={f} value={f}>
                    Ficha {f}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleExportLogsCsv}
                disabled={filteredLogs.length === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Exportar Ingresos CSV
              </button>
            </div>
          </div>

          {loadingLogs ? (
            <div className="space-y-2 py-4">
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Aún no hay registros de ingreso para los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 pr-4 font-medium">Aprendiz</th>
                    <th className="py-2.5 px-3 font-medium">Documento</th>
                    <th className="py-2.5 px-3 font-medium">Ficha</th>
                    <th className="py-2.5 px-3 font-medium">Programa</th>
                    <th className="py-2.5 px-3 font-medium">Evento</th>
                    <th className="py-2.5 px-3 font-medium">Evaluación</th>
                    <th className="py-2.5 pl-3 font-medium text-right">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {filteredLogs.map((log) => {
                    const matchedEval = evaluationByUidFicha.get(
                      `${log.uid}__${log.ficha}`
                    );
                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                          {log.apprenticeName}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          {log.documentType} {log.documentNumber}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          {log.ficha}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                          {log.programa}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400">
                          {log.action === 'registro'
                            ? 'Registro inicial'
                            : 'Ingreso'}
                        </td>
                        <td className="py-3 px-3 text-xs font-medium">
                          {matchedEval ? (
                            <span className="inline-flex items-center gap-1 text-[#166534] dark:text-emerald-400 font-mono tabular-nums">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Evaluado ({matchedEval.totalScore}%)
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">
                              Solo ingresó
                            </span>
                          )}
                        </td>
                        <td className="py-3 pl-3 text-right text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                          {formatTimestamp(log.createdAt, log.createdAtMs)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: GRUPOS Y FICHAS */}
      {activeSubTab === 'grupos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-1">
                Alta de Cohorte SENA
              </p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Crear nuevo grupo o ficha
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Las fichas activas aparecen automáticamente en el selector de registro obligatorio para tus aprendices.
              </p>
            </div>

            <form onSubmit={handleCreateCohort} className="space-y-4">
              <div>
                <label
                  htmlFor="coh-code"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Número de Ficha
                </label>
                <input
                  id="coh-code"
                  type="text"
                  value={newFichaCode}
                  onChange={(e) => setNewFichaCode(e.target.value)}
                  required
                  minLength={4}
                  maxLength={20}
                  placeholder="Ej. 2984512"
                  className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="coh-prog"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Programa de formación
                </label>
                <input
                  id="coh-prog"
                  type="text"
                  value={newPrograma}
                  onChange={(e) => setNewPrograma(e.target.value)}
                  required
                  minLength={3}
                  maxLength={120}
                  placeholder="Ej. Técnico en Sistemas Teleinformáticos"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="coh-jornada"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Jornada
                </label>
                <select
                  id="coh-jornada"
                  value={newJornada}
                  onChange={(e) =>
                    setNewJornada(e.target.value as CohortJornada)
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                >
                  {JORNADA_OPTIONS.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>

              {cohortError && (
                <p className="text-xs text-red-700 dark:text-red-400">
                  {cohortError}
                </p>
              )}
              {cohortMessage && (
                <p className="text-xs text-[#166534] dark:text-emerald-400">
                  {cohortMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={savingCohort}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {savingCohort ? 'Guardando ficha...' : 'Habilitar ficha'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Grupos configurados ({cohorts.length})
            </h3>

            {loadingCohorts ? (
              <div className="space-y-2 py-4">
                <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ) : cohorts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
                Aún no has creado fichas. Registra tu primer grupo usando el formulario para facilitar el ingreso de aprendices.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {cohorts.map((cohort) => {
                  const active = cohort.status === 'activa';
                  return (
                    <div
                      key={cohort.fichaCode}
                      className="py-4 first:pt-2 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                            Ficha {cohort.fichaCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{cohort.jornada}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              active
                                ? 'text-[#166534] dark:text-emerald-400 font-medium'
                                : 'text-slate-500 dark:text-slate-400'
                            }
                          >
                            {active ? 'Activa' : 'Archivada'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate mt-1">
                          {cohort.programa}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleToggleCohortStatus(cohort)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        {active ? 'Archivar' : 'Reactivar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: VIDEOS INSTITUCIONALES */}
      {activeSubTab === 'videos' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-1">
                Configuración de Videos en Identidad SENA
              </p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Himno del SENA y Presentación Institucional
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pega cualquier enlace completo de YouTube (watch, youtu.be, embed) o el identificador de video directamente.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDefaultVideos}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar sugeridos
            </button>
          </div>

          <form onSubmit={handleSaveVideos} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video 1: Himno */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <p className="text-xs font-semibold text-[#166534] dark:text-emerald-400">
                  01 · Himno del SENA
                </p>
                <div>
                  <label
                    htmlFor="vid-anthem-id"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    URL de YouTube o ID del video
                  </label>
                  <input
                    id="vid-anthem-id"
                    type="text"
                    value={anthemInput}
                    onChange={(e) => setAnthemInput(e.target.value)}
                    required
                    placeholder="https://www.youtube.com/watch?v=ZejiOSVZMyI"
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="vid-anthem-title"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Título visible
                  </label>
                  <input
                    id="vid-anthem-title"
                    type="text"
                    value={anthemTitle}
                    onChange={(e) => setAnthemTitle(e.target.value)}
                    required
                    minLength={3}
                    maxLength={120}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="vid-anthem-desc"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Descripción pedagógica
                  </label>
                  <textarea
                    id="vid-anthem-desc"
                    rows={3}
                    value={anthemDescription}
                    onChange={(e) => setAnthemDescription(e.target.value)}
                    maxLength={300}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Video 2: Presentación Institucional */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <p className="text-xs font-semibold text-[#166534] dark:text-emerald-400">
                  02 · Presentación Institucional SENA
                </p>
                <div>
                  <label
                    htmlFor="vid-inst-id"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    URL de YouTube o ID del video
                  </label>
                  <input
                    id="vid-inst-id"
                    type="text"
                    value={institutionalInput}
                    onChange={(e) => setInstitutionalInput(e.target.value)}
                    required
                    placeholder="https://www.youtube.com/watch?v=k4U-KjM8c3g"
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="vid-inst-title"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Título visible
                  </label>
                  <input
                    id="vid-inst-title"
                    type="text"
                    value={institutionalTitle}
                    onChange={(e) => setInstitutionalTitle(e.target.value)}
                    required
                    minLength={3}
                    maxLength={120}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="vid-inst-desc"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Descripción pedagógica
                  </label>
                  <textarea
                    id="vid-inst-desc"
                    rows={3}
                    value={institutionalDescription}
                    onChange={(e) =>
                      setInstitutionalDescription(e.target.value)
                    }
                    maxLength={300}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {videosError && (
              <p className="text-xs text-red-700 dark:text-red-400">
                {videosError}
              </p>
            )}
            {videosMessage && (
              <div className="flex items-center gap-2 text-xs font-medium text-[#166534] dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{videosMessage}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingVideos}
                className="px-5 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {savingVideos ? 'Guardando videos...' : 'Guardar videos institucionales'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
