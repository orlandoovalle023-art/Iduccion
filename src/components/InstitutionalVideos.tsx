import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { PlaySquare, Music2, CheckCircle2, Building2 } from 'lucide-react';
import {
  DEFAULT_INSTITUTIONAL_VIDEOS,
  SENA_ANTHEM_STANZAS,
} from '../data/senaContent';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { InstitutionalVideosConfig } from '../types/sena';

export const InstitutionalVideos: React.FC = () => {
  const { localCompletedModules, markModuleCompleted } = useAuth();
  const [videoConfig, setVideoConfig] = useState<InstitutionalVideosConfig>(
    DEFAULT_INSTITUTIONAL_VIDEOS
  );
  const [activeVideoTab, setActiveVideoTab] = useState<'himno' | 'presentacion'>(
    'himno'
  );

  useEffect(() => {
    const loadServerVideos = async () => {
      try {
        const res = await fetch('/api/videos');
        if (res.ok) {
          const payload = (await res.json()) as {
            videos?: Partial<InstitutionalVideosConfig> | null;
          };
          if (payload.videos) {
            const data = payload.videos;
            setVideoConfig({
              anthemVideoId:
                data.anthemVideoId && data.anthemVideoId !== 'ZejiOSVZMyI'
                  ? data.anthemVideoId
                  : DEFAULT_INSTITUTIONAL_VIDEOS.anthemVideoId,
              anthemTitle:
                data.anthemTitle || DEFAULT_INSTITUTIONAL_VIDEOS.anthemTitle,
              anthemDescription:
                data.anthemDescription ||
                DEFAULT_INSTITUTIONAL_VIDEOS.anthemDescription,
              institutionalVideoId:
                data.institutionalVideoId ||
                DEFAULT_INSTITUTIONAL_VIDEOS.institutionalVideoId,
              institutionalTitle:
                data.institutionalTitle ||
                DEFAULT_INSTITUTIONAL_VIDEOS.institutionalTitle,
              institutionalDescription:
                data.institutionalDescription ||
                DEFAULT_INSTITUTIONAL_VIDEOS.institutionalDescription,
            });
          }
        }
      } catch {
        // Ignore
      }
    };
    void loadServerVideos();

    const ref = doc(db, 'app_settings', 'videos');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<InstitutionalVideosConfig>;
          setVideoConfig({
            anthemVideoId:
              data.anthemVideoId && data.anthemVideoId !== 'ZejiOSVZMyI'
                ? data.anthemVideoId
                : DEFAULT_INSTITUTIONAL_VIDEOS.anthemVideoId,
            anthemTitle:
              data.anthemTitle || DEFAULT_INSTITUTIONAL_VIDEOS.anthemTitle,
            anthemDescription:
              data.anthemDescription ||
              DEFAULT_INSTITUTIONAL_VIDEOS.anthemDescription,
            institutionalVideoId:
              data.institutionalVideoId ||
              DEFAULT_INSTITUTIONAL_VIDEOS.institutionalVideoId,
            institutionalTitle:
              data.institutionalTitle ||
              DEFAULT_INSTITUTIONAL_VIDEOS.institutionalTitle,
            institutionalDescription:
              data.institutionalDescription ||
              DEFAULT_INSTITUTIONAL_VIDEOS.institutionalDescription,
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'app_settings/videos');
      }
    );

    return () => unsub();
  }, []);

  const videosCompleted = localCompletedModules.includes('videos_sena');
  const currentVideoId =
    activeVideoTab === 'himno'
      ? videoConfig.anthemVideoId
      : videoConfig.institutionalVideoId;
  const currentTitle =
    activeVideoTab === 'himno'
      ? videoConfig.anthemTitle
      : videoConfig.institutionalTitle;
  const currentDescription =
    activeVideoTab === 'himno'
      ? videoConfig.anthemDescription
      : videoConfig.institutionalDescription;

  const isSafeYoutubeId = /^[a-zA-Z0-9_\-]{6,20}$/.test(currentVideoId);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-1">
            Multimedia de Inducción · Himno y Presentación Institucional
          </p>
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
            Videos institucionales del SENA
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Reproduce el himno oficial acompañado de sus estrofas o explora la presentación sobre el impacto nacional del SENA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div
            role="tablist"
            aria-label="Selección de video institucional"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeVideoTab === 'himno'}
              onClick={() => setActiveVideoTab('himno')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeVideoTab === 'himno'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Music2 className="w-4 h-4" />
              01. Himno del SENA
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeVideoTab === 'presentacion'}
              onClick={() => setActiveVideoTab('presentacion')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeVideoTab === 'presentacion'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <PlaySquare className="w-4 h-4" />
              02. Presentación Institucional
            </button>
          </div>

          <button
            type="button"
            onClick={() => void markModuleCompleted('videos_sena')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              videosCompleted
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#166534] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-[#166534] dark:bg-emerald-700 text-white hover:bg-[#14532D] dark:hover:bg-emerald-600'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {videosCompleted ? 'Videos vistos (+50 XP)' : 'Marcar videos como vistos'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
            {isSafeYoutubeId ? (
              <iframe
                key={currentVideoId}
                src={`https://www.youtube-nocookie.com/embed/${currentVideoId}?rel=0`}
                title={currentTitle}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-6 text-center text-sm text-slate-300">
                El identificador de video configurado no es válido. Solicita al instructor actualizarlo en el panel de videos.
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
              {currentTitle}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {currentDescription}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5">
          {activeVideoTab === 'himno' ? (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                <p className="text-xs font-medium text-[#166534] dark:text-emerald-400">
                  Letra oficial del Himno del SENA
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Letra: Luis Alfredo Sarmiento · Música: Daniel Marlez
                </p>
              </div>
              <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                {SENA_ANTHEM_STANZAS.map((stanza) => (
                  <div key={stanza.label} className="space-y-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {stanza.label}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {stanza.lines.map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < stanza.lines.length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[#166534] dark:text-emerald-400">
                <Building2 className="w-4 h-4" />
                <span>Sentido institucional del video</span>
              </div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Claves para observar durante la presentación
              </h4>
              <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                <li className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                  Identifica cómo los centros de formación se articulan con la vocación económica de cada región del país.
                </li>
                <li className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                  Reconoce los pilares de gratuidad, inclusión productiva, innovación tecnológica y emprendimiento (Fondo Emprender).
                </li>
                <li className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                  Relaciona tu programa de formación con las oportunidades de contrato de aprendizaje y empleabilidad.
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
