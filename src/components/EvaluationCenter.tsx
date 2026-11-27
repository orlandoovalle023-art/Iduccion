import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  CheckCircle2,
  ClipboardCheck,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  LogIn,
  Award,
  Flame,
  Lock,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  DOMAIN_LABELS,
  EVALUATION_QUESTIONS,
  EvaluationQuestion,
  SENA_BADGES,
  SENA_LEVELS,
  computeLevelFromXp,
} from '../data/senaContent';
import {
  OperationType,
  db,
  handleFirestoreError,
} from '../lib/firebase';
import {
  sanitizeDisplayName,
  sanitizeDocumentNumber,
  sanitizeFicha,
  sanitizePrograma,
  useAuth,
} from '../context/AuthContext';
import { CompetencyDomain, DomainScores, KnowledgeEvaluation } from '../types/sena';
import { SenaLogo } from './SenaLogo';

function computeStreakStats(
  questions: EvaluationQuestion[],
  answers: Record<string, number>
): { currentStreak: number; bestStreak: number } {
  let current = 0;
  let best = 0;
  for (const q of questions) {
    const ans = answers[q.id];
    if (ans === undefined) continue;
    if (ans === q.correctIndex) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return { currentStreak: current, bestStreak: best };
}

export const EvaluationCenter: React.FC = () => {
  const {
    user,
    activeUid,
    profile,
    isInstructor,
    signIn,
    setOnboardingOpen,
    markModuleCompleted,
    awardEvaluationGamification,
  } = useAuth();

  const [mode, setMode] = useState<'diagnostico' | 'integral'>('diagnostico');
  const [activeQuestions, setActiveQuestions] = useState<EvaluationQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submittedResult, setSubmittedResult] =
    useState<KnowledgeEvaluation | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [history, setHistory] = useState<KnowledgeEvaluation[]>([]);
  const [fichaInput, setFichaInput] = useState('');
  const [programaInput, setProgramaInput] = useState('');

  useEffect(() => {
    if (profile) {
      setFichaInput(profile.ficha);
      setProgramaInput(profile.programa);
    }
  }, [profile]);

  useEffect(() => {
    if (!activeUid) {
      setHistory([]);
      return;
    }

    if (user && user.emailVerified) {
      const q = query(
        collection(db, 'evaluations'),
        where('uid', '==', user.uid),
        limit(20)
      );

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as KnowledgeEvaluation),
            }))
            .sort(
              (a, b) =>
                (b.createdAt?.toMillis?.() ?? 0) -
                (a.createdAt?.toMillis?.() ?? 0)
            )
            .slice(0, 10);
          setHistory(docs);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'evaluations');
        }
      );

      return () => unsub();
    }

    try {
      const saved = localStorage.getItem(`sena_apr_evals_${activeUid}`);
      setHistory(saved ? (JSON.parse(saved) as KnowledgeEvaluation[]) : []);
    } catch {
      setHistory([]);
    }
  }, [user, activeUid]);

  const canStartOfficialEvaluation = Boolean(
    activeUid &&
      ((user && user.emailVerified) || Boolean(profile?.onboardingCompleted))
  );

  const currentXp = profile?.xpPoints || 0;
  const currentLevelInfo = useMemo(
    () => computeLevelFromXp(currentXp),
    [currentXp]
  );
  const nextLevelInfo = useMemo(
    () => SENA_LEVELS.find((l) => l.level === currentLevelInfo.level + 1) || null,
    [currentLevelInfo]
  );

  const levelProgressPercent = useMemo(() => {
    if (!nextLevelInfo) return 100;
    const span = nextLevelInfo.minXp - currentLevelInfo.minXp;
    if (span <= 0) return 100;
    return Math.min(
      100,
      Math.max(0, Math.round(((currentXp - currentLevelInfo.minXp) / span) * 100))
    );
  }, [currentXp, currentLevelInfo, nextLevelInfo]);

  const earnedBadgesSet = useMemo(
    () => new Set(profile?.earnedBadges || []),
    [profile?.earnedBadges]
  );

  const liveStreak = useMemo(
    () => computeStreakStats(activeQuestions, answers),
    [activeQuestions, answers]
  );

  const startEvaluation = (selectedMode: 'diagnostico' | 'integral') => {
    if (!activeUid || (!isInstructor && !profile?.onboardingCompleted)) {
      setOnboardingOpen(true);
      return;
    }

    setMode(selectedMode);
    const chosen =
      selectedMode === 'diagnostico'
        ? [
            EVALUATION_QUESTIONS[0],
            EVALUATION_QUESTIONS[1],
            EVALUATION_QUESTIONS[4],
            EVALUATION_QUESTIONS[3],
            EVALUATION_QUESTIONS[6],
            EVALUATION_QUESTIONS[7],
            EVALUATION_QUESTIONS[9],
            EVALUATION_QUESTIONS[10],
          ]
        : EVALUATION_QUESTIONS;
    setActiveQuestions(chosen);
    setCurrentIndex(0);
    setAnswers({});
    setSubmittedResult(null);
    setSaveSuccess(false);
  };

  const computeEvaluation = (): KnowledgeEvaluation => {
    const domains: CompetencyDomain[] = [
      'identidad',
      'derechosDeberes',
      'debidoProceso',
      'etapaProductiva',
    ];

    const domainTotals: Record<
      CompetencyDomain,
      { correct: number; total: number }
    > = {
      identidad: { correct: 0, total: 0 },
      derechosDeberes: { correct: 0, total: 0 },
      debidoProceso: { correct: 0, total: 0 },
      etapaProductiva: { correct: 0, total: 0 },
    };

    let correctCount = 0;
    activeQuestions.forEach((q) => {
      domainTotals[q.domain].total += 1;
      if (answers[q.id] === q.correctIndex) {
        correctCount += 1;
        domainTotals[q.domain].correct += 1;
      }
    });

    const domainScores: DomainScores = {
      identidad:
        domainTotals.identidad.total > 0
          ? Math.round(
              (domainTotals.identidad.correct / domainTotals.identidad.total) *
                100
            )
          : 0,
      derechosDeberes:
        domainTotals.derechosDeberes.total > 0
          ? Math.round(
              (domainTotals.derechosDeberes.correct /
                domainTotals.derechosDeberes.total) *
                100
            )
          : 0,
      debidoProceso:
        domainTotals.debidoProceso.total > 0
          ? Math.round(
              (domainTotals.debidoProceso.correct /
                domainTotals.debidoProceso.total) *
                100
            )
          : 0,
      etapaProductiva:
        domainTotals.etapaProductiva.total > 0
          ? Math.round(
              (domainTotals.etapaProductiva.correct /
                domainTotals.etapaProductiva.total) *
                100
            )
          : 0,
    };

    let weakest: CompetencyDomain = domains[0];
    domains.forEach((d) => {
      if (domainScores[d] < domainScores[weakest]) {
        weakest = d;
      }
    });

    const totalScore = Math.round((correctCount / activeQuestions.length) * 100);
    const { bestStreak } = computeStreakStats(activeQuestions, answers);

    const unlockedBadges: string[] = [];
    if (domainScores.identidad === 100) unlockedBadges.push('identidad_viva');
    if (domainScores.derechosDeberes === 100)
      unlockedBadges.push('guardian_deberes');
    if (domainScores.debidoProceso === 100)
      unlockedBadges.push('garante_proceso');
    if (domainScores.etapaProductiva === 100)
      unlockedBadges.push('ruta_productiva');
    if (totalScore >= 85) unlockedBadges.push('apropiacion_integral');
    if (bestStreak >= 5) unlockedBadges.push('racha_imparable');

    const baseXp = correctCount * 15;
    const modeBonus = mode === 'integral' ? 40 : 20;
    const streakBonus = bestStreak >= 5 ? 40 : bestStreak >= 3 ? 20 : 0;
    const xpEarned = Math.min(2000, baseXp + modeBonus + streakBonus);

    return {
      uid: activeUid || 'local-preview',
      apprenticeName: sanitizeDisplayName(
        profile?.displayName || user?.displayName
      ),
      documentNumber: sanitizeDocumentNumber(
        profile?.documentNumber || 'PENDIENTE'
      ),
      ficha: sanitizeFicha(fichaInput || profile?.ficha || '2901000'),
      programa: sanitizePrograma(
        programaInput || profile?.programa || 'Formación Titulada SENA'
      ),
      mode,
      totalScore,
      correctCount,
      questionCount: activeQuestions.length,
      domainScores,
      weakestDomain: weakest,
      xpEarned,
      bestStreak,
      unlockedBadges: unlockedBadges.slice(0, 10),
    };
  };

  const handleFinish = async () => {
    const result = computeEvaluation();
    setSubmittedResult(result);
    void markModuleCompleted('evaluacion');

    if (activeUid && (profile?.onboardingCompleted || (user && user.emailVerified))) {
      setSaving(true);
      const serverPayload = {
        uid: activeUid,
        apprenticeName: result.apprenticeName,
        documentNumber: result.documentNumber,
        ficha: result.ficha,
        programa: result.programa,
        mode: result.mode,
        totalScore: result.totalScore,
        correctCount: result.correctCount,
        questionCount: result.questionCount,
        domainScores: result.domainScores,
        weakestDomain: result.weakestDomain,
        xpEarned: result.xpEarned,
        bestStreak: result.bestStreak,
        unlockedBadges: result.unlockedBadges,
      };

      let evalId = `eval_${Date.now()}`;
      try {
        const docRef = await addDoc(collection(db, 'evaluations'), {
          ...serverPayload,
          createdAt: serverTimestamp(),
        });
        evalId = docRef.id;
      } catch {
        // Continue with server sync even if Firestore is unavailable
      }

      try {
        await fetch('/api/evaluations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...serverPayload, id: evalId }),
        });
      } catch {
        // Ignore network error
      }

      try {
        await awardEvaluationGamification(
          result.xpEarned,
          result.unlockedBadges
        );
      } catch {
        // Ignore profile update error
      }

      if (!user) {
        const localEntry: KnowledgeEvaluation = {
          ...result,
          id: evalId,
        };
        setHistory((prev) => {
          const next = [localEntry, ...prev].slice(0, 10);
          try {
            localStorage.setItem(
              `sena_apr_evals_${activeUid}`,
              JSON.stringify(next)
            );
          } catch {
            // Ignore
          }
          return next;
        });
      }
      setSaveSuccess(true);
      setSaving(false);
    }
  };

  const currentQuestion = activeQuestions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <section aria-labelledby="evaluacion-heading" className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-2">
            Módulo 03 · Evaluación de Conocimientos Adquiridos
          </p>
          <h2
            id="evaluacion-heading"
            className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-balance"
          >
            Diagnóstico y verificación de apropiación normativa
          </h2>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Mide tu dominio en Identidad SENA, Derechos y Deberes, Debido Proceso y Etapa Productiva mientras avanzas en tu ruta personal de niveles e insignias.
          </p>
        </div>

        {activeQuestions.length > 0 && !submittedResult && (
          <button
            type="button"
            onClick={() => setActiveQuestions([])}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            Cambiar modalidad
          </button>
        )}
      </div>

      {/* Onboarding Gate Banner if signed-out or missing document/ficha */}
      {!canStartOfficialEvaluation && activeQuestions.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg shrink-0">
              <UserCheck className="w-5 h-5 text-[#166534] dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-1">
                Registro previo obligatorio
              </p>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                Registra tu documento de identidad y ficha antes de evaluar
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                No necesitas cuenta de Google. Cada evaluación queda vinculada a tu documento y grupo para que tu instructor realice seguimiento real.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void signIn()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              Instructor (Google)
            </button>
            <button
              type="button"
              onClick={() => setOnboardingOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 transition-colors whitespace-nowrap"
            >
              <UserCheck className="w-4 h-4" />
              Registrarme (sin Google)
            </button>
          </div>
        </div>
      )}

      {/* Mode Selection + Apprentice Context */}
      {activeQuestions.length === 0 && !submittedResult && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 tabular-nums">
                    8 preguntas · Hasta +180 XP
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Diagnóstico Inicial de Inducción
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                    Ideal al inicio de la semana de inducción para identificar saberes previos y vacíos del grupo por competencia.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEvaluation('diagnostico')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap"
                >
                  {canStartOfficialEvaluation
                    ? 'Iniciar diagnóstico'
                    : 'Registrarse para iniciar'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[#166534] dark:text-emerald-400 font-medium mb-2 tabular-nums">
                    12 preguntas · Hasta +260 XP
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Evaluación Integral de Apropiación
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                    Evalúa los cuatro ejes del Reglamento e Identidad SENA, habilita todas las insignias y genera reporte para tu instructor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEvaluation('integral')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 transition-colors whitespace-nowrap"
                >
                  {canStartOfficialEvaluation
                    ? 'Iniciar evaluación integral'
                    : 'Registrarse para evaluar'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Registered Apprentice Metadata Card */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-[#166534] dark:text-emerald-400" />
                  <span>Datos vinculados a la evaluación</span>
                </span>
                {user && !isInstructor && (
                  <button
                    type="button"
                    onClick={() => setOnboardingOpen(true)}
                    className="text-xs font-medium text-[#166534] dark:text-emerald-400 hover:underline"
                  >
                    Actualizar
                  </button>
                )}
              </div>

              {profile && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg space-y-1 text-xs">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {profile.displayName}
                  </p>
                  <p className="font-mono text-slate-600 dark:text-slate-400">
                    {profile.documentType !== 'NA'
                      ? `${profile.documentType} ${profile.documentNumber}`
                      : 'Documento pendiente'}
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="eval-ficha"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Número de Ficha
                </label>
                <input
                  id="eval-ficha"
                  type="text"
                  value={fichaInput}
                  onChange={(e) => setFichaInput(e.target.value)}
                  placeholder="Ej. 2901845"
                  maxLength={20}
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                />
              </div>
              <div>
                <label
                  htmlFor="eval-programa"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Programa de Formación
                </label>
                <input
                  id="eval-programa"
                  type="text"
                  value={programaInput}
                  onChange={(e) => setProgramaInput(e.target.value)}
                  placeholder="Ej. Análisis y Desarrollo de Software"
                  maxLength={120}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Personal Gamification Showcase (No Ranking) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#166534] dark:text-emerald-400">
                  Progreso Personal SENA · Niveles e Insignias
                </p>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Nivel {currentLevelInfo.level} · {currentLevelInfo.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {currentLevelInfo.description}
                </p>
              </div>

              <div className="min-w-[220px] space-y-1.5">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {currentXp} XP acumulados
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                    {nextLevelInfo
                      ? `Meta Nivel ${nextLevelInfo.level}: ${nextLevelInfo.minXp} XP`
                      : 'Nivel máximo alcanzado'}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#39A900] transition-all duration-300"
                    style={{ width: `${levelProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SENA_BADGES.map((badge) => {
                const unlocked = earnedBadgesSet.has(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-xl border transition-colors flex items-start gap-3 ${
                      unlocked
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg border shrink-0 ${
                        unlocked
                          ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-700 text-[#166534] dark:text-emerald-400'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {unlocked ? (
                        <Award className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {badge.title}
                        </p>
                        <span
                          className={`text-xs font-medium shrink-0 ${
                            unlocked
                              ? 'text-[#166534] dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {unlocked ? 'Desbloqueada' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {badge.criteria}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active Question Runner */}
      {activeQuestions.length > 0 && !submittedResult && currentQuestion && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-medium text-[#166534] dark:text-emerald-400">
              {DOMAIN_LABELS[currentQuestion.domain]}
            </span>

            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <span
                className={`inline-flex items-center gap-1.5 font-medium ${
                  liveStreak.currentStreak >= 2
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Racha: {liveStreak.currentStreak}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Pregunta {currentIndex + 1} de {activeQuestions.length}
              </span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#39A900] transition-all duration-200"
              style={{
                width: `${((currentIndex + 1) / activeQuestions.length) * 100}%`,
              }}
            />
          </div>

          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            {currentQuestion.prompt}
          </h3>

          <div className="space-y-2.5">
            {currentQuestion.options.map((option, idx) => {
              const selected = answers[currentQuestion.id] === idx;
              const letter = ['A', 'B', 'C', 'D'][idx];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: idx,
                    }))
                  }
                  className={`w-full text-left p-4 rounded-lg border transition-colors flex items-start gap-3 min-h-[48px] ${
                    selected
                      ? 'bg-[#166534]/10 dark:bg-emerald-950/50 border-[#166534] dark:border-emerald-500 text-slate-900 dark:text-slate-100 font-medium'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border shrink-0 mt-0.5 ${
                      selected
                        ? 'bg-[#166534] dark:bg-emerald-700 text-white border-[#166534] dark:border-emerald-700'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="text-sm sm:text-base leading-relaxed">
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Anterior
            </button>

            {currentIndex < activeQuestions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                disabled={answers[currentQuestion.id] === undefined}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={answeredCount < activeQuestions.length || saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {saving ? 'Registrando...' : 'Finalizar evaluación'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results View */}
      {submittedResult && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-4">
                <SenaLogo className="w-11 h-11 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {submittedResult.mode === 'diagnostico'
                      ? 'Diagnóstico Inicial'
                      : 'Evaluación Integral'}{' '}
                    · Ficha {submittedResult.ficha} · Doc.{' '}
                    {submittedResult.documentNumber}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    Apropiación alcanzada: {submittedResult.totalScore}% (
                    {submittedResult.correctCount}/
                    {submittedResult.questionCount})
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Área prioritaria de refuerzo:{' '}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {DOMAIN_LABELS[
                        submittedResult.weakestDomain as CompetencyDomain
                      ] || submittedResult.weakestDomain}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSubmittedResult(null);
                  setActiveQuestions([]);
                }}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap self-start md:self-center"
              >
                Volver al inicio de evaluación
              </button>
            </div>

            {/* Personal Gamification Summary for this Attempt */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-lg flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#166534] dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Experiencia obtenida
                  </p>
                  <p className="text-lg font-semibold font-mono text-[#166534] dark:text-emerald-300 tabular-nums">
                    +{submittedResult.xpEarned} XP
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-3">
                <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Mejor racha consecutiva
                  </p>
                  <p className="text-lg font-semibold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                    {submittedResult.bestStreak} aciertos
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-3">
                <Award className="w-5 h-5 text-[#166534] dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Rango personal actual
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Nivel {currentLevelInfo.level} · {currentLevelInfo.name}
                  </p>
                </div>
              </div>
            </div>

            {submittedResult.unlockedBadges.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Insignias logradas en esta evaluación
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {submittedResult.unlockedBadges.map((badgeId) => {
                    const badge = SENA_BADGES.find((b) => b.id === badgeId);
                    if (!badge) return null;
                    return (
                      <div
                        key={badge.id}
                        className="p-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2.5"
                      >
                        <Award className="w-4 h-4 text-[#166534] dark:text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {badge.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {saveSuccess && (
              <div className="flex items-center gap-2 text-sm text-[#166534] dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Resultado e historial personal guardados en la nube para seguimiento de tu instructor.
                </span>
              </div>
            )}

            {/* Domain Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.keys(DOMAIN_LABELS) as CompetencyDomain[]).map(
                (domainKey) => {
                  const score = submittedResult.domainScores[domainKey];
                  const isLow = score < 70;
                  return (
                    <div
                      key={domainKey}
                      className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2"
                    >
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {DOMAIN_LABELS[domainKey]}
                      </p>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                          {score}%
                        </span>
                        <span
                          className={`text-xs font-medium inline-flex items-center gap-1 ${
                            isLow
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-[#166534] dark:text-emerald-400'
                          }`}
                        >
                          {isLow ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Reforzar
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Apropiado
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Question-by-Question Pedagogical Review */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-4">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Retroalimentación detallada por pregunta
            </h4>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {activeQuestions.map((q, idx) => {
                const chosen = answers[q.id];
                const correct = chosen === q.correctIndex;
                return (
                  <div key={q.id} className="py-4 first:pt-2 last:pb-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {idx + 1}. {q.prompt}
                      </p>
                      <span
                        className={`text-xs font-medium inline-flex items-center gap-1 shrink-0 ${
                          correct
                            ? 'text-[#166534] dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {correct ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Correcta
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4" />
                            Por reforzar
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Historical Evaluations for signed-in user */}
      {activeUid && history.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Historial de evaluaciones registradas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Modalidad</th>
                  <th className="py-2.5 px-3 font-medium">Ficha</th>
                  <th className="py-2.5 px-3 font-medium text-right">Puntaje</th>
                  <th className="py-2.5 px-3 font-medium text-right">XP</th>
                  <th className="py-2.5 px-3 font-medium text-right">Racha</th>
                  <th className="py-2.5 pl-4 font-medium">Área de refuerzo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                      {item.mode === 'diagnostico'
                        ? 'Diagnóstico Inicial'
                        : 'Evaluación Integral'}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      {item.ficha}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {item.totalScore}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-[#166534] dark:text-emerald-400 tabular-nums">
                      +{item.xpEarned || 0}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                      {item.bestStreak || 0}
                    </td>
                    <td className="py-3 pl-4 text-slate-600 dark:text-slate-400">
                      {DOMAIN_LABELS[item.weakestDomain as CompetencyDomain] ||
                        item.weakestDomain}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
