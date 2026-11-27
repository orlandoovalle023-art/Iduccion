import React, { useState } from 'react';
import { CheckCircle2, Compass, ShieldCheck, BookOpen, ArrowRight } from 'lucide-react';
import { SENA_ECOSYSTEM, SENA_SYMBOLS } from '../data/senaContent';
import { useAuth } from '../context/AuthContext';
import { ResilientImage } from './ResilientImage';
import { SenaLogo } from './SenaLogo';
import { InstitutionalVideos } from './InstitutionalVideos';

interface IdentityExplorerProps {
  onNavigateTab: (tab: 'identidad' | 'reglamento' | 'evaluacion' | 'envivo') => void;
}

export const IdentityExplorer: React.FC<IdentityExplorerProps> = ({ onNavigateTab }) => {
  const { localCompletedModules, markModuleCompleted } = useAuth();
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>(SENA_SYMBOLS[0].id);
  const [selectedPillarId, setSelectedPillarId] = useState<string>(SENA_ECOSYSTEM[0].id);
  const [reviewedSymbols, setReviewedSymbols] = useState<string[]>([SENA_SYMBOLS[0].id]);

  const activeSymbol =
    SENA_SYMBOLS.find((item) => item.id === selectedSymbolId) || SENA_SYMBOLS[0];
  const activePillar =
    SENA_ECOSYSTEM.find((item) => item.id === selectedPillarId) || SENA_ECOSYSTEM[0];

  const isCompleted = localCompletedModules.includes('identidad');

  const handleSelectSymbol = (id: string) => {
    setSelectedSymbolId(id);
    setReviewedSymbols((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  return (
    <section aria-labelledby="identidad-heading" className="space-y-12">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-2">
            Módulo 01 · Identidad Institucional SENA
          </p>
          <h2
            id="identidad-heading"
            className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-balance"
          >
            Símbolos, valores y ecosistema formativo del SENA
          </h2>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Comprende el sentido institucional de tu formación profesional integral antes de iniciar la etapa lectiva.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Símbolos explorados: {reviewedSymbols.length}/{SENA_SYMBOLS.length}
          </span>
          <button
            type="button"
            onClick={() => void markModuleCompleted('identidad')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              isCompleted
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#166534] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-[#166534] dark:bg-emerald-700 text-white hover:bg-[#14532D] dark:hover:bg-emerald-600'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {isCompleted ? 'Módulo apropiado' : 'Registrar apropiación'}
          </button>
        </div>
      </div>

      {/* Interactive Symbols Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col">
            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              <ResilientImage
                src="https://historico.sena.edu.co/es-co/sena/PublishingImages/Paginas/quienesSomos/escudo.jpg"
                alt="Escudo oficial del SENA: piñón industrial, caduceo y ramas de café"
                fallbackTitle="Escudo Oficial del SENA"
                className="w-full h-full object-contain bg-white p-3"
              />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Principio rector · Ley 119 de 1994
                </p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Formación gratuita con pertinencia social
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  El Servicio Nacional de Aprendizaje cumple la función social de invertir en el desarrollo técnico y humano de los trabajadores colombianos.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Valores: Honestidad · Respeto · Compromiso</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div
              role="tablist"
              aria-label="Símbolos institucionales del SENA"
              className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-6"
            >
              {SENA_SYMBOLS.map((symbol) => {
                const active = symbol.id === selectedSymbolId;
                return (
                  <button
                    key={symbol.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleSelectSymbol(symbol.id)}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {symbol.title.replace('El ', '').replace('La ', '').replace(' del SENA', '').replace(' Institucional', '')}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{activeSymbol.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Apropiación institucional</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {activeSymbol.title}
                  </h3>
                </div>
                {activeSymbol.id === 'logosimbolo' && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shrink-0">
                    <SenaLogo className="w-16 h-16" alt="Logo Símbolo oficial del SENA" />
                  </div>
                )}
              </div>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeSymbol.summary}
              </p>

              <div className="pt-2 space-y-2.5">
                {activeSymbol.meaning.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-100 dark:border-slate-800"
                  >
                    <span className="font-mono text-xs font-semibold text-[#166534] dark:text-emerald-400 mt-0.5 tabular-nums">
                      0{idx + 1}
                    </span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <Compass className="w-5 h-5 text-[#166534] dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Sentido práctico para el aprendiz
              </p>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {activeSymbol.appropriationTip}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Ecosystem Explorer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
              Mapa del ecosistema institucional SENA
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Selecciona cada componente para conocer cómo apoya tu trayectoria desde la inducción hasta la certificación.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('reglamento')}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#166534] dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
          >
            Continuar al Reglamento
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-2">
            {SENA_ECOSYSTEM.map((pillar, index) => {
              const selected = pillar.id === selectedPillarId;
              return (
                <button
                  key={pillar.id}
                  type="button"
                  onClick={() => setSelectedPillarId(pillar.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                    selected
                      ? 'bg-[#166534]/5 dark:bg-emerald-950/40 border-[#166534] dark:border-emerald-500 text-slate-900 dark:text-slate-100'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      0{index + 1} · {pillar.role}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {pillar.title}
                    </p>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 shrink-0 ${
                      selected
                        ? 'text-[#166534] dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                <BookOpen className="w-4 h-4 text-[#166534] dark:text-emerald-400" />
                <span>{activePillar.role}</span>
              </div>
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                {activePillar.title}
              </h4>
              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                {activePillar.description}
              </p>
            </div>

            <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#166534] dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                  Acción clave en tu primera semana
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {activePillar.keyAction}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Videos: Himno y Presentación Institucional */}
      <InstitutionalVideos />
    </section>
  );
};
