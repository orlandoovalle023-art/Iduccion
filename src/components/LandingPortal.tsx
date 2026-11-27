import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DocumentType } from '../types/sena';
import { ResilientImage } from './ResilientImage';
import { SenaLogo } from './SenaLogo';

interface LandingPortalProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type SelectedRole = 'aprendiz' | 'instructor';

const MODULE_PREVIEWS = [
  {
    index: '01.',
    title: 'Identidad SENA',
    description:
      'Explora el escudo, bandera, logo símbolo, himno oficial y ecosistema formativo institucional.',
  },
  {
    index: '02.',
    title: 'Reglamento del Aprendiz',
    description:
      'Analiza derechos, deberes, prohibiciones y simulador de casos reales del Acuerdo 00007 de 2012.',
  },
  {
    index: '03.',
    title: 'Evaluación de Conocimientos',
    description:
      'Diagnóstico inicial e integral por competencias con retroalimentación normativa e insignias personales.',
  },
  {
    index: '04.',
    title: 'Sensibilización en Vivo',
    description:
      'Debate dilemas éticos en tiempo real con tu ficha bajo la conducción del instructor.',
  },
];

export const LandingPortal: React.FC<LandingPortalProps> = ({
  theme,
  onToggleTheme,
}) => {
  const {
    activeCohorts,
    instructorStatus,
    authError,
    completeOnboarding,
    claimInstructorCredentials,
    loginInstructor,
    signIn,
  } = useAuth();

  const [selectedRole, setSelectedRole] = useState<SelectedRole>('aprendiz');

  // Apprentice identification state
  const [displayName, setDisplayName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [selectedCohortCode, setSelectedCohortCode] = useState<string>('manual');
  const [ficha, setFicha] = useState('');
  const [programa, setPrograma] = useState('');
  const [apprenticeError, setApprenticeError] = useState<string | null>(null);
  const [submittingApprentice, setSubmittingApprentice] = useState(false);

  // Instructor credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [instructorError, setInstructorError] = useState<string | null>(null);
  const [submittingInstructor, setSubmittingInstructor] = useState(false);

  useEffect(() => {
    if (activeCohorts.length > 0 && !ficha && selectedCohortCode === 'manual') {
      setSelectedCohortCode(activeCohorts[0].fichaCode);
      setFicha(activeCohorts[0].fichaCode);
      setPrograma(activeCohorts[0].programa);
    }
  }, [activeCohorts, ficha, selectedCohortCode]);

  const scrollToAccess = (role?: SelectedRole) => {
    if (role) {
      setSelectedRole(role);
    }
    const el = document.getElementById('acceso-plataforma');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCohortChange = (code: string) => {
    setSelectedCohortCode(code);
    if (code === 'manual') {
      setFicha('');
      setPrograma('');
      return;
    }
    const found = activeCohorts.find((c) => c.fichaCode === code);
    if (found) {
      setFicha(found.fichaCode);
      setPrograma(found.programa);
    }
  };

  const handleApprenticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApprenticeError(null);

    const cleanName = displayName.trim();
    const cleanDoc = documentNumber.replace(/[^a-zA-Z0-9\-]/g, '');
    const cleanFicha = ficha.replace(/[^a-zA-Z0-9\-]/g, '');
    const cleanPrograma = programa.trim();

    if (cleanName.length < 2) {
      setApprenticeError('Ingresa tu nombre completo (mínimo 2 caracteres).');
      return;
    }
    if (cleanDoc.length < 4) {
      setApprenticeError(
        'Ingresa un número de documento válido (mínimo 4 caracteres).'
      );
      return;
    }
    if (cleanFicha.length < 4) {
      setApprenticeError(
        'Ingresa tu número de ficha de formación (mínimo 4 caracteres).'
      );
      return;
    }
    if (cleanPrograma.length < 3) {
      setApprenticeError('Ingresa el nombre de tu programa de formación.');
      return;
    }

    setSubmittingApprentice(true);
    try {
      await completeOnboarding({
        displayName: cleanName,
        documentType,
        documentNumber: cleanDoc,
        ficha: cleanFicha,
        programa: cleanPrograma,
      });
    } catch (err) {
      setApprenticeError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar tu registro. Inténtalo de nuevo.'
      );
    } finally {
      setSubmittingApprentice(false);
    }
  };

  const handleInstructorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInstructorError(null);

    const cleanUser = username.trim();
    if (cleanUser.length < 2) {
      setInstructorError('Ingresa el usuario de instructor.');
      return;
    }
    if (password.length < 3) {
      setInstructorError('Ingresa la contraseña de acceso (mínimo 3 caracteres).');
      return;
    }

    setSubmittingInstructor(true);
    try {
      if (!instructorStatus.ready) {
        await claimInstructorCredentials(cleanUser, password);
      } else {
        await loginInstructor(cleanUser, password);
      }
    } catch (err) {
      setInstructorError(
        err instanceof Error
          ? err.message
          : 'No fue posible validar las credenciales de instructor.'
      );
    } finally {
      setSubmittingInstructor(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#proposito"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            <SenaLogo className="w-8 h-8" />
            <span>Inducción SENA</span>
          </a>

          <nav
            aria-label="Navegación de inicio"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
          >
            <a
              href="#proposito"
              className="py-1 hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Propósito
            </a>
            <a
              href="#modulos"
              className="py-1 hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Módulos
            </a>
            <a
              href="#acceso-plataforma"
              onClick={(e) => {
                e.preventDefault();
                scrollToAccess();
              }}
              className="py-1 hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Acceso por rol
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
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

            <button
              type="button"
              onClick={() => scrollToAccess()}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#166534] dark:bg-emerald-700 rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 transition-colors whitespace-nowrap shrink-0"
            >
              Ingresar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Split Section */}
        <section
          id="proposito"
          className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
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
                    Servicio Nacional de Aprendizaje · Proceso de Inducción
                  </p>
                  <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-slate-900 dark:text-slate-100 leading-[1.12] tracking-tight text-balance">
                    Identidad institucional y Reglamento del Aprendiz SENA
                  </h1>
                  <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                    Selecciona tu rol para acceder al entorno correspondiente: los aprendices apropian símbolos, normativa y evaluación diagnóstica; los instructores gestionan fichas, analítica y sensibilización en vivo.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => scrollToAccess('aprendiz')}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 transition-colors whitespace-nowrap shrink-0"
                  >
                    Ingresar como Aprendiz
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToAccess('instructor')}
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    Acceso Instructor
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Acuerdo 00007 de 2012</span>
                  <span aria-hidden="true">·</span>
                  <span>Registro por ficha y documento</span>
                  <span aria-hidden="true">·</span>
                  <span>Sensibilización sincrónica</span>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-64 sm:h-80 lg:h-full min-h-[320px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                  <ResilientImage
                    src="/src/assets/images/hero_sena_campus_1795551810921.jpg"
                    alt="Aprendices SENA colaborando en centro de formación tecnológica"
                    fallbackTitle="Centro de Formación SENA"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* 4-Column Module Preview Strip */}
            <div
              id="modulos"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-slate-200 dark:border-slate-800"
            >
              {MODULE_PREVIEWS.map((item) => (
                <div
                  key={item.index}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2"
                >
                  <p className="font-mono text-xs font-semibold text-[#166534] dark:text-emerald-400 tabular-nums">
                    {item.index}
                  </p>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Role Selection & Validated Entry Section */}
        <section
          id="acceso-plataforma"
          aria-labelledby="role-gate-heading"
          className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-16"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Role Switcher */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-1.5">
                  Control de ingreso por perfil
                </p>
                <h2
                  id="role-gate-heading"
                  className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-balance"
                >
                  Selecciona tu rol para ingresar
                </h2>
                <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                  Al validar tus datos accederás únicamente a las herramientas y módulos asignados a tu rol dentro del proceso de inducción.
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Selección de rol de usuario"
                className="space-y-3"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedRole === 'aprendiz'}
                  onClick={() => setSelectedRole('aprendiz')}
                  className={`w-full text-left p-5 rounded-xl border transition-colors flex items-start gap-4 ${
                    selectedRole === 'aprendiz'
                      ? 'bg-white dark:bg-slate-900 border-[#166534] dark:border-emerald-500 ring-1 ring-[#166534] dark:ring-emerald-500'
                      : 'bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg border shrink-0 ${
                      selectedRole === 'aprendiz'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-[#166534] dark:text-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Soy Aprendiz SENA
                      </span>
                      {selectedRole === 'aprendiz' && (
                        <CheckCircle2 className="w-4 h-4 text-[#166534] dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Ingresa con tu nombre, documento de identidad y número de ficha para estudiar los módulos, evaluar conocimientos y participar en vivo.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedRole === 'instructor'}
                  onClick={() => setSelectedRole('instructor')}
                  className={`w-full text-left p-5 rounded-xl border transition-colors flex items-start gap-4 ${
                    selectedRole === 'instructor'
                      ? 'bg-white dark:bg-slate-900 border-[#166534] dark:border-emerald-500 ring-1 ring-[#166534] dark:ring-emerald-500'
                      : 'bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg border shrink-0 ${
                      selectedRole === 'instructor'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-[#166534] dark:text-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Soy Instructor SENA
                      </span>
                      {selectedRole === 'instructor' && (
                        <CheckCircle2 className="w-4 h-4 text-[#166534] dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Accede con usuario y contraseña para consultar resultados por ficha, eliminar evaluaciones, gestionar grupos, videos y dirigir salas en vivo.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Right Column: Role-Specific Form */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
              {selectedRole === 'aprendiz' ? (
                <div className="space-y-6">
                  <div className="flex items-start gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg shrink-0">
                      <UserCheck className="w-5 h-5 text-[#166534] dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#166534] dark:text-emerald-400">
                        Registro de Aprendiz · Sin cuenta Google
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Datos básicos de identificación y ficha
                      </h3>
                    </div>
                  </div>

                  <form onSubmit={handleApprenticeSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="landing-apr-name"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Nombre completo *
                      </label>
                      <input
                        id="landing-apr-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={100}
                        placeholder="Ej. María Fernanda Gómez"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-5 sm:col-span-4">
                        <label
                          htmlFor="landing-apr-doctype"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          Tipo de doc. *
                        </label>
                        <select
                          id="landing-apr-doctype"
                          value={documentType}
                          onChange={(e) =>
                            setDocumentType(e.target.value as DocumentType)
                          }
                          className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                        >
                          <option value="CC">Cédula (CC)</option>
                          <option value="TI">T. Identidad (TI)</option>
                          <option value="CE">C. Extranjería (CE)</option>
                          <option value="PPT">PPT</option>
                        </select>
                      </div>
                      <div className="col-span-7 sm:col-span-8">
                        <label
                          htmlFor="landing-apr-docnum"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          Número de documento *
                        </label>
                        <input
                          id="landing-apr-docnum"
                          type="text"
                          value={documentNumber}
                          onChange={(e) => setDocumentNumber(e.target.value)}
                          required
                          minLength={4}
                          maxLength={20}
                          placeholder="Ej. 1014258963"
                          className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {activeCohorts.length > 0 && (
                      <div>
                        <label
                          htmlFor="landing-apr-cohort"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          Selecciona tu ficha registrada
                        </label>
                        <select
                          id="landing-apr-cohort"
                          value={selectedCohortCode}
                          onChange={(e) => handleCohortChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                        >
                          {activeCohorts.map((c) => (
                            <option key={c.fichaCode} value={c.fichaCode}>
                              Ficha {c.fichaCode} · {c.programa} ({c.jornada})
                            </option>
                          ))}
                          <option value="manual">
                            Otra ficha (ingresar manualmente)
                          </option>
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-4">
                        <label
                          htmlFor="landing-apr-ficha"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          Número de Ficha *
                        </label>
                        <input
                          id="landing-apr-ficha"
                          type="text"
                          value={ficha}
                          onChange={(e) => {
                            setFicha(e.target.value);
                            setSelectedCohortCode('manual');
                          }}
                          required
                          minLength={4}
                          maxLength={20}
                          placeholder="Ej. 2901845"
                          className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                        />
                      </div>
                      <div className="sm:col-span-8">
                        <label
                          htmlFor="landing-apr-programa"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          Programa de formación *
                        </label>
                        <input
                          id="landing-apr-programa"
                          type="text"
                          value={programa}
                          onChange={(e) => setPrograma(e.target.value)}
                          required
                          minLength={3}
                          maxLength={120}
                          placeholder="Ej. Análisis y Desarrollo de Software"
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {apprenticeError && (
                      <div
                        role="alert"
                        className="text-xs sm:text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3.5 py-2.5"
                      >
                        {apprenticeError}
                      </div>
                    )}

                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        Accederás a Identidad, Reglamento, Evaluación y En Vivo
                      </span>
                      <button
                        type="submit"
                        disabled={submittingApprentice}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                      >
                        {submittingApprentice
                          ? 'Validando ingreso...'
                          : 'Ingresar como Aprendiz'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-start gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg shrink-0">
                      <Lock className="w-5 h-5 text-[#166534] dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#166534] dark:text-emerald-400">
                        Acceso exclusivo para Instructores
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {instructorStatus.loading
                          ? 'Verificando acceso...'
                          : instructorStatus.ready
                          ? 'Validación de usuario y contraseña'
                          : 'Configuración inicial de usuario y contraseña'}
                      </h3>
                    </div>
                  </div>

                  {!instructorStatus.loading && !instructorStatus.ready && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      Primer ingreso en esta sesión del servidor: define ahora el usuario y contraseña de instructor que utilizarás para acceder (por ejemplo, usuario <span className="font-mono font-semibold">SENA</span> y clave <span className="font-mono font-semibold">123</span>). También puedes fijarlos de forma permanente desde Configuración → Secretos.
                    </div>
                  )}

                  <form onSubmit={handleInstructorSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="landing-inst-user"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Usuario de instructor *
                      </label>
                      <input
                        id="landing-inst-user"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        minLength={2}
                        maxLength={60}
                        autoComplete="username"
                        placeholder="Ej. SENA"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="landing-inst-pass"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Contraseña *
                      </label>
                      <div className="relative">
                        <input
                          id="landing-inst-pass"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={3}
                          maxLength={128}
                          autoComplete={
                            instructorStatus.ready
                              ? 'current-password'
                              : 'new-password'
                          }
                          placeholder="Ingresa tu contraseña"
                          className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={
                            showPassword
                              ? 'Ocultar contraseña'
                              : 'Mostrar contraseña'
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {instructorError && (
                      <div
                        role="alert"
                        className="text-xs sm:text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3.5 py-2.5"
                      >
                        {instructorError}
                      </div>
                    )}

                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Accederás al Panel Instructor, resultados y salas en vivo
                      </span>
                      <button
                        type="submit"
                        disabled={submittingInstructor || instructorStatus.loading}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                      >
                        {submittingInstructor
                          ? 'Validando...'
                          : instructorStatus.ready
                          ? 'Ingresar como Instructor'
                          : 'Guardar credenciales e ingresar'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ¿Prefieres entrar con tu cuenta institucional de Google?
                    </span>
                    <button
                      type="button"
                      onClick={() => void signIn()}
                      className="text-xs font-medium text-[#166534] dark:text-emerald-400 hover:underline whitespace-nowrap self-start sm:self-center"
                    >
                      Ingresar con Google
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
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
              onClick={() => scrollToAccess('aprendiz')}
              className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
            >
              Ingreso Aprendiz
            </button>
            <button
              type="button"
              onClick={() => scrollToAccess('instructor')}
              className="hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
            >
              Ingreso Instructor
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
