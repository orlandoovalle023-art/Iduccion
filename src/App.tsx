import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  BookOpenCheck,
  Moon,
  Sun,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResilientImage } from './components/ResilientImage';
import { IdentityExplorer } from './components/IdentityExplorer';
import { RegulationSimulator } from './components/RegulationSimulator';
import { EvaluationCenter } from './components/EvaluationCenter';
import { LiveSensitization } from './components/LiveSensitization';
import { InstructorDashboard } from './components/InstructorDashboard';
import { ProfileModal } from './components/ProfileModal';
import { OnboardingModal } from './components/OnboardingModal';
import { LandingPortal } from './components/LandingPortal';
import { SenaLogo } from './components/SenaLogo';

type ActiveTab = 'identidad' | 'reglamento' | 'evaluacion' | 'envivo';
type WorkspaceMode = 'aprendiz' | 'instructor';
type ThemeMode = 'light' | 'dark';

const MODULE_CARDS: {
  id: ActiveTab;
  index: string;
  title: string;
  description: string;
  progressKey: string;
}[] = [
  {
    id: 'identidad',
    index: '01',
    title: 'Identidad SENA',
    description: 'Escudo, bandera, logo símbolo, valores y ecosistema formativo.',
    progressKey: 'identidad',
  },
  {
    id: 'reglamento',
    index: '02',
    title: 'Reglamento del Aprendiz',
    description: 'Capítulos normativos y simulador de casos de debido proceso.',
    progressKey: 'reglamento',
  },
  {
    id: 'evaluacion',
    index: '03',
    title: 'Evaluación Diagnóstica',
    description: 'Diagnóstico inicial e integral por competencias con retroalimentación.',
    progressKey: 'evaluacion',
  },
  {
    id: 'envivo',
    index: '04',
    title: 'Sensibilización en Vivo',
    description: 'Sala sincronizada en tiempo real para debatir dilemas con la ficha.',
    progressKey: 'sensibilizacion',
  },
];

const AppShell: React.FC = () => {
  const {
    activeUid,
    profile,
    authReady,
    isInstructor,
    instructorUsername,
    authError,
    logout,
    localCompletedModules,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('identidad');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('aprendiz');
  const [profileOpen, setProfileOpen] = useState(false);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });
  const [isBlurring, setIsBlurring] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (isInstructor) {
      setWorkspaceMode('instructor');
    } else {
      setWorkspaceMode('aprendiz');
    }
  }, [isInstructor]);

  const handleToggleTheme = () => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const applyNextTheme = () => {
      const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem('sena_theme', next);
      } catch {
        // Ignore storage error
      }
      setTheme(next);
    };

    if (prefersReducedMotion) {
      applyNextTheme();
      return;
    }

    setIsBlurring(true);
    window.setTimeout(() => {
      applyNextTheme();
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          setIsBlurring(false);
        }, 40);
      });
    }, 130);
  };

  const navigateToModule = (tab: ActiveTab) => {
    setWorkspaceMode('aprendiz');
    setActiveTab(tab);
    const el = document.getElementById('workspace-stage');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const hasValidatedApprentice = Boolean(
    activeUid && profile?.onboardingCompleted && !isInstructor
  );
  const hasValidatedRole = isInstructor || hasValidatedApprentice;

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950 text-slate-600 dark:text-slate-300 text-sm">
        Cargando plataforma Inducción SENA...
      </div>
    );
  }

  if (!hasValidatedRole) {
    return (
      <div className={`theme-stage ${isBlurring ? 'is-blurring' : ''}`}>
        <LandingPortal theme={theme} onToggleTheme={handleToggleTheme} />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 theme-stage ${
        isBlurring ? 'is-blurring' : ''
      }`}
    >
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              setWorkspaceMode(isInstructor ? 'instructor' : 'aprendiz');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            <SenaLogo className="w-8 h-8" />
            <span>Inducción SENA</span>
          </a>

          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
          >
            {isInstructor && (
              <button
                type="button"
                onClick={() => setWorkspaceMode('instructor')}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  workspaceMode === 'instructor'
                    ? 'border-[#166534] dark:border-emerald-400 text-slate-900 dark:text-slate-100 font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                Panel Instructor
              </button>
            )}
            {(
              [
                ['identidad', 'Identidad'],
                ['reglamento', 'Reglamento'],
                ['evaluacion', 'Evaluación'],
                ['envivo', 'En Vivo'],
              ] as [ActiveTab, string][]
            ).map(([tabId, label]) => {
              const active = workspaceMode === 'aprendiz' && activeTab === tabId;
              return (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => navigateToModule(tabId)}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[#166534] dark:border-emerald-400 text-slate-900 dark:text-slate-100 font-semibold'
                      : 'border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={
                theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
              }
              title={
                theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
              }
              className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Modo claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-700 shrink-0" />
                  <span className="hidden sm:inline">Modo oscuro</span>
                </>
              )}
            </button>

            {isInstructor ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setWorkspaceMode(
                      workspaceMode === 'instructor' ? 'aprendiz' : 'instructor'
                    )
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    workspaceMode === 'instructor'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#166534] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-[#166534] dark:bg-emerald-700 text-white hover:bg-[#14532D] dark:hover:bg-emerald-600'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">
                    {workspaceMode === 'instructor'
                      ? instructorUsername || profile?.displayName || 'Instructor'
                      : 'Panel Instructor'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="px-3 py-2 text-xs font-medium text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors whitespace-nowrap shrink-0"
                >
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-[#166534] dark:bg-emerald-700 rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 transition-colors whitespace-nowrap shrink-0 max-w-[160px] truncate"
                >
                  {profile?.displayName || 'Mi perfil'}
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Cambiar rol
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Split Section only shown in Vista Aprendiz so Instructor lands straight in their Dashboard */}
        {!isInstructor && (
        <section
          id="inicio"
          className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
            {authError && (
              <div
                role="alert"
                className="mb-6 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/70 rounded-lg text-sm text-red-800 dark:text-red-300"
              >
                {authError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-[#166534] dark:text-emerald-400">
                    Servicio Nacional de Aprendizaje · Ruta del Aprendiz
                  </p>
                  <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-slate-900 dark:text-slate-100 leading-[1.12] tracking-tight text-balance">
                    Apropiación del Reglamento e Identidad SENA en la práctica
                  </h1>
                  <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                    Explora los símbolos institucionales, resuelve casos reales del Acuerdo 00007 de 2012, evalúa tus conocimientos por competencias y participa en sesiones de sensibilización en tiempo real.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => navigateToModule('evaluacion')}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 transition-colors whitespace-nowrap shrink-0"
                  >
                    Iniciar evaluación diagnóstica
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToModule('envivo')}
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    Sensibilización en vivo
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Módulos apropiados: {localCompletedModules.length}/4</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {profile
                      ? `Ficha ${profile.ficha} · ${profile.programa}`
                      : 'Sesión de Aprendiz activa'}
                  </span>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-64 sm:h-80 lg:h-full min-h-[300px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                  <ResilientImage
                    src="/src/assets/images/hero_sena_campus_1795551810921.jpg"
                    alt="Aprendices SENA colaborando en centro de formación tecnológica"
                    fallbackTitle="Centro de Formación SENA"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* 4-Column Interactive Module Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-slate-200 dark:border-slate-800">
              {MODULE_CARDS.map((card) => {
                const isDone = localCompletedModules.includes(card.progressKey);
                const isActive = workspaceMode === 'aprendiz' && activeTab === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => navigateToModule(card.id)}
                    className={`text-left p-5 rounded-xl border transition-colors flex flex-col justify-between ${
                      isActive
                        ? 'bg-[#166534]/5 dark:bg-emerald-950/40 border-[#166534] dark:border-emerald-500'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs mb-2">
                        <span className="font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                          {card.index}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            isDone
                              ? 'text-[#166534] dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {isDone ? 'Completado' : 'Disponible'}
                        </span>
                      </div>
                      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
                        {card.title}
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        )}

        {/* Workspace Stage */}
        <div
          id="workspace-stage"
          className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14 space-y-8"
        >
          {/* Instructor Workspace Toolbar + Mobile Module Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex md:hidden items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg overflow-x-auto">
              {(
                [
                  ['identidad', 'Identidad'],
                  ['reglamento', 'Reglamento'],
                  ['evaluacion', 'Evaluación'],
                  ['envivo', 'En Vivo'],
                ] as [ActiveTab, string][]
              ).map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => {
                    setWorkspaceMode('aprendiz');
                    setActiveTab(tabId);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                    workspaceMode === 'aprendiz' && activeTab === tabId
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {isInstructor && (
              <div
                role="tablist"
                aria-label="Modo de espacio de trabajo"
                className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg self-start sm:ml-auto"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={workspaceMode === 'aprendiz'}
                  onClick={() => setWorkspaceMode('aprendiz')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    workspaceMode === 'aprendiz'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <BookOpenCheck className="w-4 h-4" />
                  Vista Aprendiz
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={workspaceMode === 'instructor'}
                  onClick={() => setWorkspaceMode('instructor')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    workspaceMode === 'instructor'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Panel Instructor
                </button>
              </div>
            )}
          </div>

          {workspaceMode === 'instructor' && isInstructor ? (
            <InstructorDashboard
              onGoToLiveSensitization={() => {
                setWorkspaceMode('aprendiz');
                setActiveTab('envivo');
              }}
            />
          ) : (
            <>
              {activeTab === 'identidad' && (
                <IdentityExplorer onNavigateTab={navigateToModule} />
              )}
              {activeTab === 'reglamento' && (
                <RegulationSimulator onNavigateTab={navigateToModule} />
              )}
              {activeTab === 'evaluacion' && <EvaluationCenter />}
              {activeTab === 'envivo' && <LiveSensitization />}
            </>
          )}
        </div>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <SenaLogo className="w-7 h-7" />
            <p>
              Inducción SENA · Prototipo pedagógico para apropiación del Reglamento del Aprendiz (Acuerdo 00007 de 2012) e Identidad Institucional.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigateToModule('identidad')}
              className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
            >
              Identidad
            </button>
            <button
              type="button"
              onClick={() => navigateToModule('reglamento')}
              className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
            >
              Reglamento
            </button>
            <button
              type="button"
              onClick={() => navigateToModule('evaluacion')}
              className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
            >
              Evaluación
            </button>
          </div>
        </div>
      </footer>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <OnboardingModal />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
