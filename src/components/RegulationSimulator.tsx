import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Scale,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { REGULATION_CASES, REGULATION_CHAPTERS } from '../data/senaContent';
import { useAuth } from '../context/AuthContext';
import { ResilientImage } from './ResilientImage';

interface RegulationSimulatorProps {
  onNavigateTab: (tab: 'identidad' | 'reglamento' | 'evaluacion' | 'envivo') => void;
}

export const RegulationSimulator: React.FC<RegulationSimulatorProps> = ({
  onNavigateTab,
}) => {
  const { localCompletedModules, markModuleCompleted } = useAuth();
  const [activeChapterId, setActiveChapterId] = useState<string>(
    REGULATION_CHAPTERS[0].id
  );
  const [caseIndex, setCaseIndex] = useState(0);
  const [selectedType, setSelectedType] = useState<'Académica' | 'Disciplinaria' | ''>('');
  const [selectedSeverity, setSelectedSeverity] = useState<'Leve' | 'Grave' | 'Gravísima' | ''>('');
  const [selectedMeasure, setSelectedMeasure] = useState<string>('');
  const [verified, setVerified] = useState(false);
  const [solvedCases, setSolvedCases] = useState<string[]>([]);

  const activeChapter =
    REGULATION_CHAPTERS.find((c) => c.id === activeChapterId) || REGULATION_CHAPTERS[0];
  const currentCase = REGULATION_CASES[caseIndex];
  const isCompleted = localCompletedModules.includes('reglamento');

  const isAllCorrect =
    verified &&
    selectedType === currentCase.correctType &&
    selectedSeverity === currentCase.correctSeverity &&
    selectedMeasure === currentCase.correctMeasure;

  const handleVerifyCase = () => {
    if (!selectedType || !selectedSeverity || !selectedMeasure) return;
    setVerified(true);
    if (
      selectedType === currentCase.correctType &&
      selectedSeverity === currentCase.correctSeverity &&
      selectedMeasure === currentCase.correctMeasure
    ) {
      setSolvedCases((prev) => {
        const next = prev.includes(currentCase.id) ? prev : [...prev, currentCase.id];
        if (next.length >= 2) {
          void markModuleCompleted('reglamento');
        }
        return next;
      });
    }
  };

  const handleSelectCase = (idx: number) => {
    setCaseIndex(idx);
    setSelectedType('');
    setSelectedSeverity('');
    setSelectedMeasure('');
    setVerified(false);
  };

  return (
    <section aria-labelledby="reglamento-heading" className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-2">
            Módulo 02 · Reglamento del Aprendiz SENA
          </p>
          <h2
            id="reglamento-heading"
            className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-balance"
          >
            Derechos, deberes, prohibiciones y simulador de debido proceso
          </h2>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Consulta los capítulos esenciales del Acuerdo 00007 de 2012 y resuelve casos reales de convivencia y formación.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Casos resueltos: {solvedCases.length}/{REGULATION_CASES.length}
          </span>
          <button
            type="button"
            onClick={() => void markModuleCompleted('reglamento')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              isCompleted
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#166534] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-[#166534] dark:bg-emerald-700 text-white hover:bg-[#14532D] dark:hover:bg-emerald-600'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {isCompleted ? 'Reglamento apropiado' : 'Marcar como revisado'}
          </button>
        </div>
      </div>

      {/* Chapter Explorer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
        <div
          role="tablist"
          aria-label="Capítulos del Reglamento del Aprendiz"
          className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-6"
        >
          {REGULATION_CHAPTERS.map((chapter) => {
            const active = chapter.id === activeChapterId;
            return (
              <button
                key={chapter.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveChapterId(chapter.id)}
                className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {chapter.chapter} · {chapter.title.split(',')[0].replace(' del Aprendiz', '')}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{activeChapter.chapter}</span>
              <span aria-hidden="true">·</span>
              <span>{activeChapter.reference}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {activeChapter.title}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeChapter.summary}
            </p>
            <ul className="space-y-2.5 pt-2">
              {activeChapter.points.map((point, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
                >
                  <span className="font-mono text-xs font-semibold text-[#166534] dark:text-emerald-400 mt-0.5 tabular-nums">
                    0{idx + 1}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
              <ResilientImage
                src="/src/assets/images/workshop_safety_regulation_1795551811425.jpg"
                alt="Mesa de trabajo formativo SENA con casco, gafas de seguridad y equipos de estudio"
                fallbackTitle="Ambiente Formativo y Normativa SST"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex-1">
              <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-1.5">
                Aplicación en ambiente de aprendizaje
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeChapter.practicalExample}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Case Simulator (Two-Zone Sandbox) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Scale className="w-4 h-4 text-[#166534] dark:text-emerald-400" />
              <span>Simulador Práctico · Análisis de Faltas y Debido Proceso</span>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {currentCase.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
            {REGULATION_CASES.map((item, idx) => {
              const active = idx === caseIndex;
              const isSolved = solvedCases.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectCase(idx)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap tabular-nums ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : isSolved
                      ? 'text-[#166534] dark:text-emerald-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Caso 0{idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          {/* Left Zone: Case Narrative & Feedback */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {currentCase.context}
              </p>
              <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed">
                {currentCase.scenario}
              </p>
            </div>

            {verified && (
              <div
                className={`rounded-xl border p-5 space-y-3 ${
                  isAllCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/70'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isAllCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-[#166534] dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
                  )}
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {isAllCorrect
                      ? 'Clasificación correcta conforme al Reglamento'
                      : `Revisa tu análisis: Falta ${currentCase.correctType} · ${currentCase.correctSeverity}`}
                  </p>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {currentCase.legalExplanation}
                </p>
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Ruta del Debido Proceso:
                  </p>
                  <p className="text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed">
                    {currentCase.dueProcessStep}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Zone: Interactive Decision Controls */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                1. Tipo de falta según el Reglamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Académica', 'Disciplinaria'] as const).map((typeOpt) => (
                  <button
                    key={typeOpt}
                    type="button"
                    onClick={() => {
                      setSelectedType(typeOpt);
                      setVerified(false);
                    }}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      selectedType === typeOpt
                        ? 'bg-[#166534] dark:bg-emerald-700 text-white border-[#166534] dark:border-emerald-700'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {typeOpt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                2. Calificación de gravedad
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Leve', 'Grave', 'Gravísima'] as const).map((sevOpt) => (
                  <button
                    key={sevOpt}
                    type="button"
                    onClick={() => {
                      setSelectedSeverity(sevOpt);
                      setVerified(false);
                    }}
                    className={`px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      selectedSeverity === sevOpt
                        ? 'bg-[#166534] dark:bg-emerald-700 text-white border-[#166534] dark:border-emerald-700'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {sevOpt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                3. Medida formativa o ruta institucional procedente
              </label>
              <div className="space-y-2">
                {currentCase.measureOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSelectedMeasure(option);
                      setVerified(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm rounded-lg border transition-colors ${
                      selectedMeasure === option
                        ? 'bg-[#166534]/10 dark:bg-emerald-950/50 border-[#166534] dark:border-emerald-500 text-slate-900 dark:text-slate-100 font-medium'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleVerifyCase}
                  disabled={!selectedType || !selectedSeverity || !selectedMeasure}
                  className="px-5 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  Verificar decisión
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectCase(caseIndex)}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reiniciar
                </button>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('evaluacion')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#166534] dark:text-emerald-400 hover:underline whitespace-nowrap"
              >
                Ir a Evaluación
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
