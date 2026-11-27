import React, { useEffect, useState } from 'react';
import { X, LogOut, CheckCircle2, Award, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { computeLevelFromXp } from '../data/senaContent';
import { DocumentType } from '../types/sena';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const {
    activeUid,
    profile,
    isInstructor,
    activeCohorts,
    updateProfileInfo,
    signIn,
    logout,
  } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [selectedCohortCode, setSelectedCohortCode] = useState<string>('manual');
  const [ficha, setFicha] = useState('');
  const [programa, setPrograma] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setDocumentType(
        profile.documentType && profile.documentType !== 'NA'
          ? profile.documentType
          : 'CC'
      );
      setDocumentNumber(
        profile.documentNumber && profile.documentNumber !== 'PENDIENTE'
          ? profile.documentNumber
          : ''
      );
      setFicha(profile.ficha);
      setPrograma(profile.programa);
      const matchingCohort = activeCohorts.find(
        (c) => c.fichaCode === profile.ficha
      );
      setSelectedCohortCode(matchingCohort ? matchingCohort.fichaCode : 'manual');
      setSaved(false);
      setErrorMsg(null);
    }
  }, [profile, activeCohorts, open]);

  if (!open || !activeUid) return null;

  const currentXp = profile?.xpPoints || 0;
  const levelInfo = computeLevelFromXp(currentXp);

  const handleCohortChange = (code: string) => {
    setSelectedCohortCode(code);
    if (code === 'manual') return;
    const found = activeCohorts.find((c) => c.fichaCode === code);
    if (found) {
      setFicha(found.fichaCode);
      setPrograma(found.programa);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaved(false);

    const cleanDoc = documentNumber.replace(/[^a-zA-Z0-9\-]/g, '');
    if (!isInstructor && (cleanDoc.length < 4 || cleanDoc === 'PENDIENTE')) {
      setErrorMsg('Ingresa un número de documento válido (mínimo 4 caracteres).');
      return;
    }

    setSaving(true);
    try {
      await updateProfileInfo({
        displayName,
        documentType: isInstructor && !cleanDoc ? 'NA' : documentType,
        documentNumber: cleanDoc || 'INSTR-SENA',
        ficha,
        programa,
      });
      setSaved(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al actualizar el perfil.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isInstructor ? 'Cuenta de Instructor SENA' : 'Perfil de Aprendiz SENA'}
            </p>
            <h2
              id="profile-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Configuración de ficha y datos
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isInstructor && profile && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Award className="w-4 h-4 text-[#166534] dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  Nivel {levelInfo.level} · {levelInfo.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {profile.earnedBadges?.length || 0} insignias desbloqueadas
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-semibold text-[#166534] dark:text-emerald-400 tabular-nums shrink-0">
              {currentXp} XP
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="prof-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Nombre completo
            </label>
            <input
              id="prof-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5">
              <label
                htmlFor="prof-doctype"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Tipo doc.
              </label>
              <select
                id="prof-doctype"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                className="w-full px-2.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
              >
                <option value="CC">CC</option>
                <option value="TI">TI</option>
                <option value="CE">CE</option>
                <option value="PPT">PPT</option>
              </select>
            </div>
            <div className="col-span-7">
              <label
                htmlFor="prof-docnum"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Número de documento
              </label>
              <input
                id="prof-docnum"
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                required={!isInstructor}
                maxLength={20}
                placeholder="Ej. 1014258963"
                className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
              />
            </div>
          </div>

          {activeCohorts.length > 0 && (
            <div>
              <label
                htmlFor="prof-cohort"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Grupo / Ficha registrada
              </label>
              <select
                id="prof-cohort"
                value={selectedCohortCode}
                onChange={(e) => handleCohortChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
              >
                {activeCohorts.map((c) => (
                  <option key={c.fichaCode} value={c.fichaCode}>
                    Ficha {c.fichaCode} · {c.programa}
                  </option>
                ))}
                <option value="manual">Otra ficha (ingresar manualmente)</option>
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="prof-ficha"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Número de Ficha
            </label>
            <input
              id="prof-ficha"
              type="text"
              value={ficha}
              onChange={(e) => {
                setFicha(e.target.value);
                setSelectedCohortCode('manual');
              }}
              required
              minLength={4}
              maxLength={20}
              className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
            />
          </div>

          <div>
            <label
              htmlFor="prof-programa"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Programa de formación / Área
            </label>
            <input
              id="prof-programa"
              type="text"
              value={programa}
              onChange={(e) => setPrograma(e.target.value)}
              required
              minLength={3}
              maxLength={120}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
              Identificador de usuario (UID)
            </p>
            <p className="text-xs font-mono text-slate-700 dark:text-slate-200 break-all">
              {activeUid}
            </p>
          </div>

          {errorMsg && (
            <div className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2 text-xs font-medium text-[#166534] dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Cambios guardados en tu perfil.</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                void logout();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              {isInstructor ? 'Cerrar sesión' : 'Cambiar de aprendiz'}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {saving ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>

          {!isInstructor && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ¿Eres el instructor del grupo?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  void signIn();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#166534] dark:text-emerald-400 hover:underline whitespace-nowrap"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Ingresar como Instructor (Google)
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
