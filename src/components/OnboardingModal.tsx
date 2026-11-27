import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertCircle, X, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DocumentType } from '../types/sena';
import { SenaLogo } from './SenaLogo';

export const OnboardingModal: React.FC = () => {
  const {
    user,
    activeUid,
    profile,
    isInstructor,
    activeCohorts,
    onboardingOpen,
    setOnboardingOpen,
    completeOnboarding,
    signIn,
    logout,
  } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [selectedCohortCode, setSelectedCohortCode] = useState<string>('manual');
  const [ficha, setFicha] = useState('');
  const [programa, setPrograma] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(
        profile.displayName && profile.displayName !== 'Aprendiz SENA'
          ? profile.displayName
          : user?.displayName || ''
      );
      if (profile.documentType && profile.documentType !== 'NA') {
        setDocumentType(profile.documentType);
      }
      if (profile.documentNumber && profile.documentNumber !== 'PENDIENTE') {
        setDocumentNumber(profile.documentNumber);
      }
      if (profile.ficha && profile.ficha !== '2901000') {
        setFicha(profile.ficha);
      }
      if (
        profile.programa &&
        profile.programa !== 'Formación Titulada SENA'
      ) {
        setPrograma(profile.programa);
      }
    }
  }, [profile, user]);

  useEffect(() => {
    if (activeCohorts.length > 0 && selectedCohortCode === 'manual' && !ficha) {
      const first = activeCohorts[0];
      setSelectedCohortCode(first.fichaCode);
      setFicha(first.fichaCode);
      setPrograma(first.programa);
    }
  }, [activeCohorts, selectedCohortCode, ficha]);

  if (isInstructor || !onboardingOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = displayName.trim();
    const cleanDoc = documentNumber.replace(/[^a-zA-Z0-9\-]/g, '');
    const cleanFicha = ficha.replace(/[^a-zA-Z0-9\-]/g, '');
    const cleanPrograma = programa.trim();

    if (cleanName.length < 2) {
      setError('Ingresa tu nombre completo (mínimo 2 caracteres).');
      return;
    }
    if (cleanDoc.length < 5 || cleanDoc === 'PENDIENTE') {
      setError('Ingresa un número de documento válido (mínimo 5 caracteres).');
      return;
    }
    if (cleanFicha.length < 4) {
      setError('Ingresa el número de ficha de tu grupo (mínimo 4 caracteres).');
      return;
    }
    if (cleanPrograma.length < 3) {
      setError('Ingresa el nombre de tu programa de formación.');
      return;
    }

    setSubmitting(true);
    try {
      await completeOnboarding({
        displayName: cleanName,
        documentType,
        documentNumber: cleanDoc,
        ficha: cleanFicha,
        programa: cleanPrograma,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible guardar tu registro. Intenta nuevamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 sm:p-8 space-y-6 my-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-start gap-4">
            <SenaLogo className="w-10 h-10 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-1">
                Ingreso de Aprendiz · Sin cuenta Google
              </p>
              <h2
                id="onboarding-title"
                className="text-xl font-semibold text-slate-900 dark:text-slate-100"
              >
                Registra tu documento y ficha
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                No necesitas correo ni cuenta de Google. Tus datos registran tu ingreso y vinculan tus evaluaciones al grupo correspondiente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOnboardingOpen(false)}
            aria-label="Cerrar ventana"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="ob-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Nombre completo
            </label>
            <input
              id="ob-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              placeholder="Ej. María Camila Rodríguez"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label
                htmlFor="ob-doctype"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Tipo de documento
              </label>
              <select
                id="ob-doctype"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
              >
                <option value="CC">Cédula (CC)</option>
                <option value="TI">Tarjeta de Identidad (TI)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="PPT">Permiso PPT</option>
              </select>
            </div>
            <div className="sm:col-span-7">
              <label
                htmlFor="ob-docnum"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Número de documento
              </label>
              <input
                id="ob-docnum"
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                required
                minLength={5}
                maxLength={20}
                placeholder="Ej. 1014258963"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
              />
            </div>
          </div>

          {activeCohorts.length > 0 && (
            <div>
              <label
                htmlFor="ob-cohort"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Seleccionar grupo / ficha activa
              </label>
              <select
                id="ob-cohort"
                value={selectedCohortCode}
                onChange={(e) => handleCohortChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
              >
                {activeCohorts.map((c) => (
                  <option key={c.fichaCode} value={c.fichaCode}>
                    Ficha {c.fichaCode} · {c.programa} ({c.jornada})
                  </option>
                ))}
                <option value="manual">Otra ficha (ingresar manualmente)</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label
                htmlFor="ob-ficha"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Número de Ficha
              </label>
              <input
                id="ob-ficha"
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
            <div className="sm:col-span-7">
              <label
                htmlFor="ob-programa"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Programa de formación
              </label>
              <input
                id="ob-programa"
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

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/70 rounded-lg text-xs text-red-800 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            {activeUid ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cambiar de aprendiz
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void signIn()}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-[#166534] dark:hover:text-emerald-400"
              >
                <LogIn className="w-3.5 h-3.5" />
                Soy instructor (Google)
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting ? 'Ingresando...' : 'Confirmar ingreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
