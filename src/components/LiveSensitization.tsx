import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Radio,
  Users,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Copy,
  Check,
  LogIn,
  Lock,
  Send,
} from 'lucide-react';
import { SENSITIZATION_DILEMMAS } from '../data/senaContent';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import { sanitizeFicha, useAuth } from '../context/AuthContext';
import { SensitizationResponse, SensitizationSession } from '../types/sena';
import { SenaLogo } from './SenaLogo';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SN';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const LiveSensitization: React.FC = () => {
  const {
    user,
    activeUid,
    profile,
    isInstructor,
    instructorToken,
    instructorUsername,
    signIn,
    setOnboardingOpen,
    markModuleCompleted,
  } = useAuth();

  const serverInstructorUid = instructorUsername
    ? `inst_${instructorUsername.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 40)}`
    : 'inst_sena';
  const hasGoogleInstructor = Boolean(user && user.emailVerified && isInstructor);
  const hasParticipantAccess = Boolean(
    activeUid || (isInstructor && instructorToken)
  );
  const effectiveUid = activeUid || (instructorToken ? serverInstructorUid : null);

  // Room state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [activeSessionCode, setActiveSessionCode] = useState<string | null>(null);
  const [session, setSession] = useState<SensitizationSession | null>(null);
  const [sessionSource, setSessionSource] = useState<'firestore' | 'server' | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Instructor session creation & list
  const [firestoreSessions, setFirestoreSessions] = useState<SensitizationSession[]>([]);
  const [serverSessions, setServerSessions] = useState<SensitizationSession[]>([]);
  const [newTitle, setNewTitle] = useState('Sensibilización Reglamento e Identidad');
  const [newFicha, setNewFicha] = useState('2901845');
  const [newCode, setNewCode] = useState(() => generateRoomCode());
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Instructor incoming responses
  const [firestoreResponses, setFirestoreResponses] = useState<SensitizationResponse[]>([]);
  const [serverResponses, setServerResponses] = useState<SensitizationResponse[]>([]);

  // Apprentice response state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [reflectionInput, setReflectionInput] = useState('');
  const [mySavedResponse, setMySavedResponse] = useState<SensitizationResponse | null>(null);
  const [myServerResponses, setMyServerResponses] = useState<
    Record<string, SensitizationResponse>
  >({});
  const [submittingVote, setSubmittingVote] = useState(false);

  const mySessions = useMemo(() => {
    const map = new Map<string, SensitizationSession>();
    serverSessions.forEach((s) => map.set(s.sessionCode, s));
    firestoreSessions.forEach((s) => map.set(s.sessionCode, s));
    return Array.from(map.values()).sort(
      (a, b) =>
        (b.createdAt?.toMillis?.() ?? b.createdAtMs ?? 0) -
        (a.createdAt?.toMillis?.() ?? a.createdAtMs ?? 0)
    );
  }, [serverSessions, firestoreSessions]);

  const allResponses = useMemo(() => {
    const map = new Map<string, SensitizationResponse>();
    serverResponses.forEach((r) => {
      if (r.id) map.set(r.id, r);
    });
    firestoreResponses.forEach((r) => {
      if (r.id) map.set(r.id, r);
    });
    return Array.from(map.values());
  }, [serverResponses, firestoreResponses]);

  const fetchServerSessions = React.useCallback(async () => {
    if (!instructorToken) {
      setServerSessions([]);
      return;
    }
    try {
      const res = await fetch('/api/sessions', {
        headers: { Authorization: `Bearer ${instructorToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          sessions?: SensitizationSession[];
        };
        setServerSessions(Array.isArray(data.sessions) ? data.sessions : []);
      }
    } catch {
      // Ignore network hiccup
    }
  }, [instructorToken]);

  // Load instructor's server sessions
  useEffect(() => {
    if (!instructorToken || !isInstructor) {
      setServerSessions([]);
      return;
    }
    void fetchServerSessions();
    const interval = setInterval(() => {
      void fetchServerSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [instructorToken, isInstructor, fetchServerSessions]);

  // Load instructor's Firestore sessions
  useEffect(() => {
    if (!user || !user.emailVerified || !isInstructor) {
      setFirestoreSessions([]);
      return;
    }

    const q = query(
      collection(db, 'sensitization_sessions'),
      where('instructorUid', '==', user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as SensitizationSession);
        setFirestoreSessions(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'sensitization_sessions');
      }
    );

    return () => unsub();
  }, [user, isInstructor]);

  // Subscribe / poll active session document (Firestore + Server API)
  useEffect(() => {
    if (!hasParticipantAccess || !activeSessionCode) {
      setSession(null);
      setSessionSource(null);
      return;
    }

    const cleanCode = activeSessionCode.trim().toUpperCase();
    const sessionPath = `sensitization_sessions/${cleanCode}`;
    let foundInFirestore = false;
    let foundOnServer = false;
    let cancelled = false;

    const checkServerSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${encodeURIComponent(cleanCode)}`);
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { session?: SensitizationSession };
          if (data.session) {
            foundOnServer = true;
            setSessionSource('server');
            setSession(data.session);
            setSessionError(null);
            return;
          }
        }
        foundOnServer = false;
        if (!foundInFirestore && !activeUid) {
          setSession(null);
          setSessionSource(null);
          setSessionError(`No se encontró una sesión con el código ${cleanCode}.`);
        }
      } catch {
        // Ignore transient network errors
      }
    };

    void checkServerSession();
    const serverPoll = setInterval(() => {
      void checkServerSession();
    }, 2500);

    let unsubFirestore: (() => void) | null = null;
    if (activeUid) {
      unsubFirestore = onSnapshot(
        doc(db, 'sensitization_sessions', cleanCode),
        (snap) => {
          if (snap.exists()) {
            foundInFirestore = true;
            if (!foundOnServer) {
              setSessionSource('firestore');
              setSessionError(null);
              setSession(snap.data() as SensitizationSession);
            }
          } else {
            foundInFirestore = false;
            if (!foundOnServer) {
              setSession(null);
              setSessionSource(null);
              setSessionError(`No se encontró una sesión con el código ${cleanCode}.`);
            }
          }
        },
        (error) => {
          if (!foundOnServer) {
            handleFirestoreError(error, OperationType.GET, sessionPath);
          }
        }
      );
    }

    return () => {
      cancelled = true;
      clearInterval(serverPoll);
      if (unsubFirestore) unsubFirestore();
    };
  }, [hasParticipantAccess, activeUid, activeSessionCode]);

  // Subscribe to current user's own response for the active slide
  useEffect(() => {
    if (!effectiveUid || !session) {
      setMySavedResponse(null);
      return;
    }

    const respKey = `${session.sessionCode}_${session.currentSlideIndex}`;
    if (sessionSource === 'server') {
      const saved = myServerResponses[respKey] || null;
      setMySavedResponse(saved);
      setSelectedOption(saved ? saved.selectedOption : null);
      setReflectionInput(saved ? saved.reflection : '');
      return;
    }

    if (!activeUid) {
      setMySavedResponse(null);
      return;
    }

    const respId = `${activeUid}_${session.currentSlideIndex}`;
    const respPath = `sensitization_sessions/${session.sessionCode}/responses/${respId}`;

    const unsub = onSnapshot(
      doc(db, 'sensitization_sessions', session.sessionCode, 'responses', respId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as SensitizationResponse;
          setMySavedResponse(data);
          setSelectedOption(data.selectedOption);
          setReflectionInput(data.reflection);
        } else {
          setMySavedResponse(null);
          setSelectedOption(null);
          setReflectionInput('');
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, respPath);
      }
    );

    return () => unsub();
  }, [
    effectiveUid,
    activeUid,
    session?.sessionCode,
    session?.currentSlideIndex,
    sessionSource,
    myServerResponses,
  ]);

  // Instructor: poll server responses when room is on server
  useEffect(() => {
    if (!instructorToken || !session || sessionSource !== 'server') {
      setServerResponses([]);
      return;
    }

    let cancelled = false;
    const loadResponses = async () => {
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(session.sessionCode)}/responses`,
          { headers: { Authorization: `Bearer ${instructorToken}` } }
        );
        if (!cancelled && res.ok) {
          const data = (await res.json()) as {
            responses?: SensitizationResponse[];
          };
          setServerResponses(Array.isArray(data.responses) ? data.responses : []);
        }
      } catch {
        // Ignore
      }
    };

    void loadResponses();
    const interval = setInterval(() => {
      void loadResponses();
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [instructorToken, session?.sessionCode, sessionSource]);

  // Instructor: listen to Firestore responses for the active session
  useEffect(() => {
    if (!user || !user.emailVerified || !session || session.instructorUid !== user.uid) {
      setFirestoreResponses([]);
      return;
    }

    const respPath = `sensitization_sessions/${session.sessionCode}/responses`;
    const q = query(
      collection(db, 'sensitization_sessions', session.sessionCode, 'responses'),
      where('instructorUid', '==', user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as SensitizationResponse),
        }));
        setFirestoreResponses(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, respPath);
      }
    );

    return () => unsub();
  }, [user, session?.sessionCode, session?.instructorUid]);

  const currentSlideResponses = useMemo(() => {
    if (!session) return [];
    return allResponses.filter((r) => r.slideIndex === session.currentSlideIndex);
  }, [allResponses, session?.currentSlideIndex]);

  // Keep aggregated tally synced on Firestore session document when Google instructor is viewing
  useEffect(() => {
    if (
      sessionSource !== 'firestore' ||
      !user ||
      !session ||
      session.instructorUid !== user.uid ||
      session.status !== 'activa'
    ) {
      return;
    }

    const counts: [number, number, number, number] = [0, 0, 0, 0];
    currentSlideResponses.forEach((r) => {
      if (r.selectedOption >= 0 && r.selectedOption <= 3) {
        counts[r.selectedOption] += 1;
      }
    });
    const total = currentSlideResponses.length;

    const changed =
      total !== session.totalResponses ||
      counts[0] !== session.tally[0] ||
      counts[1] !== session.tally[1] ||
      counts[2] !== session.tally[2] ||
      counts[3] !== session.tally[3];

    if (!changed) return;

    const sessionPath = `sensitization_sessions/${session.sessionCode}`;
    void updateDoc(doc(db, 'sensitization_sessions', session.sessionCode), {
      tally: counts,
      totalResponses: total,
      updatedAt: serverTimestamp(),
    }).catch((error) => {
      handleFirestoreError(error, OperationType.UPDATE, sessionPath);
    });
  }, [currentSlideResponses, session, user, sessionSource]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInstructor || (!hasGoogleInstructor && !instructorToken)) return;

    const cleanCode = newCode.replace(/[^a-zA-Z0-9_\-]/g, '').toUpperCase().slice(0, 12);
    if (cleanCode.length < 6) {
      setSessionError('El código de sala debe tener al menos 6 caracteres alfanuméricos.');
      return;
    }

    const cleanTitle = newTitle.trim().slice(0, 120);
    const cleanFicha = sanitizeFicha(newFicha);
    const instructorName = (
      profile?.displayName ||
      user?.displayName ||
      instructorUsername ||
      'Instructor SENA'
    )
      .trim()
      .slice(0, 100);

    setCreating(true);
    setSessionError(null);
    const sessionPath = `sensitization_sessions/${cleanCode}`;

    try {
      if (instructorToken) {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${instructorToken}`,
          },
          body: JSON.stringify({
            sessionCode: cleanCode,
            title:
              cleanTitle.length >= 3
                ? cleanTitle
                : 'Sesión de Sensibilización SENA',
            ficha: cleanFicha,
            instructorName:
              instructorName.length >= 2 ? instructorName : 'Instructor SENA',
          }),
        });
        const data = (await res.json()) as {
          session?: SensitizationSession;
          error?: string;
        };
        if (!res.ok) {
          setSessionError(data.error || 'No se pudo crear la sala.');
          return;
        }
        if (data.session) {
          setServerSessions((prev) => [data.session!, ...prev]);
          setSession(data.session);
          setSessionSource('server');
        }
      }

      if (hasGoogleInstructor && user) {
        await setDoc(doc(db, 'sensitization_sessions', cleanCode), {
          sessionCode: cleanCode,
          title:
            cleanTitle.length >= 3
              ? cleanTitle
              : 'Sesión de Sensibilización SENA',
          ficha: cleanFicha,
          instructorUid: user.uid,
          instructorName:
            instructorName.length >= 2 ? instructorName : 'Instructor SENA',
          status: 'activa',
          currentSlideIndex: 0,
          revealResults: false,
          tally: [0, 0, 0, 0],
          totalResponses: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setActiveSessionCode(cleanCode);
      setNewCode(generateRoomCode());
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, sessionPath);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.replace(/[^a-zA-Z0-9_\-]/g, '').toUpperCase().slice(0, 12);
    if (clean.length < 6) {
      setSessionError('Ingresa un código válido de al menos 6 caracteres.');
      return;
    }
    setSessionError(null);
    setActiveSessionCode(clean);
  };

  const handleSubmitApprenticeVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUid || !session || selectedOption === null) {
      return;
    }

    const respId = `${effectiveUid}_${session.currentSlideIndex}`;
    const respPath = `sensitization_sessions/${session.sessionCode}/responses/${respId}`;
    const cleanName = (
      profile?.displayName ||
      user?.displayName ||
      instructorUsername ||
      'Aprendiz SENA'
    )
      .trim()
      .slice(0, 100);
    const cleanFicha = sanitizeFicha(profile?.ficha || session.ficha);
    const cleanReflection = reflectionInput.trim().slice(0, 400);

    setSubmittingVote(true);
    try {
      if (sessionSource === 'server') {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(session.sessionCode)}/responses`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: effectiveUid,
              apprenticeName: cleanName.length >= 2 ? cleanName : 'Aprendiz SENA',
              ficha: cleanFicha,
              slideIndex: session.currentSlideIndex,
              selectedOption,
              reflection: cleanReflection,
            }),
          }
        );
        const data = (await res.json()) as {
          response?: SensitizationResponse;
          session?: SensitizationSession;
          error?: string;
        };
        if (!res.ok) {
          setSessionError(data.error || 'No se pudo registrar tu respuesta.');
          return;
        }
        if (data.response) {
          const respKey = `${session.sessionCode}_${session.currentSlideIndex}`;
          setMyServerResponses((prev) => ({
            ...prev,
            [respKey]: data.response!,
          }));
          setMySavedResponse(data.response);
        }
        if (data.session) {
          setSession(data.session);
        }
      } else if (activeUid) {
        if (mySavedResponse) {
          await updateDoc(
            doc(
              db,
              'sensitization_sessions',
              session.sessionCode,
              'responses',
              respId
            ),
            {
              selectedOption,
              reflection: cleanReflection,
              updatedAt: serverTimestamp(),
            }
          );
        } else {
          await setDoc(
            doc(
              db,
              'sensitization_sessions',
              session.sessionCode,
              'responses',
              respId
            ),
            {
              uid: activeUid,
              sessionId: session.sessionCode,
              instructorUid: session.instructorUid,
              apprenticeName: cleanName.length >= 2 ? cleanName : 'Aprendiz SENA',
              ficha: cleanFicha,
              slideIndex: session.currentSlideIndex,
              selectedOption,
              reflection: cleanReflection,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }
          );
        }
      }
      void markModuleCompleted('sensibilizacion');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, respPath);
    } finally {
      setSubmittingVote(false);
    }
  };

  const isHost = Boolean(
    session &&
      ((user && session.instructorUid === user.uid) ||
        (instructorToken && isInstructor))
  );

  const handleChangeSlide = async (nextIndex: number) => {
    if (!session || !isHost || session.status !== 'activa') {
      return;
    }
    const clamped = Math.max(
      0,
      Math.min(SENSITIZATION_DILEMMAS.length - 1, nextIndex)
    );
    const slideResponses = allResponses.filter((r) => r.slideIndex === clamped);
    const counts: [number, number, number, number] = [0, 0, 0, 0];
    slideResponses.forEach((r) => {
      if (r.selectedOption >= 0 && r.selectedOption <= 3) counts[r.selectedOption] += 1;
    });

    const sessionPath = `sensitization_sessions/${session.sessionCode}`;
    try {
      if (sessionSource === 'server' && instructorToken) {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(session.sessionCode)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${instructorToken}`,
            },
            body: JSON.stringify({ currentSlideIndex: clamped }),
          }
        );
        if (res.ok) {
          const data = (await res.json()) as { session?: SensitizationSession };
          if (data.session) setSession(data.session);
        }
      } else if (user && session.instructorUid === user.uid) {
        await updateDoc(doc(db, 'sensitization_sessions', session.sessionCode), {
          currentSlideIndex: clamped,
          revealResults: false,
          tally: counts,
          totalResponses: slideResponses.length,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, sessionPath);
    }
  };

  const handleToggleReveal = async () => {
    if (!session || !isHost || session.status !== 'activa') {
      return;
    }
    const sessionPath = `sensitization_sessions/${session.sessionCode}`;
    try {
      if (sessionSource === 'server' && instructorToken) {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(session.sessionCode)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${instructorToken}`,
            },
            body: JSON.stringify({ revealResults: !session.revealResults }),
          }
        );
        if (res.ok) {
          const data = (await res.json()) as { session?: SensitizationSession };
          if (data.session) setSession(data.session);
        }
      } else if (user && session.instructorUid === user.uid) {
        await updateDoc(doc(db, 'sensitization_sessions', session.sessionCode), {
          revealResults: !session.revealResults,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, sessionPath);
    }
  };

  const handleCloseSession = async () => {
    if (!session || !isHost || session.status !== 'activa') {
      return;
    }
    const sessionPath = `sensitization_sessions/${session.sessionCode}`;
    try {
      if (sessionSource === 'server' && instructorToken) {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(session.sessionCode)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${instructorToken}`,
            },
            body: JSON.stringify({ status: 'finalizada', revealResults: true }),
          }
        );
        if (res.ok) {
          const data = (await res.json()) as { session?: SensitizationSession };
          if (data.session) setSession(data.session);
        }
      } else if (user && session.instructorUid === user.uid) {
        await updateDoc(doc(db, 'sensitization_sessions', session.sessionCode), {
          status: 'finalizada',
          revealResults: true,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, sessionPath);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const activeDilemma =
    SENSITIZATION_DILEMMAS[session?.currentSlideIndex ?? 0] || SENSITIZATION_DILEMMAS[0];

  return (
    <section aria-labelledby="envivo-heading" className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[#166534] dark:text-emerald-400 mb-2">
            Módulo 04 · Sensibilización en Tiempo Real
          </p>
          <h2
            id="envivo-heading"
            className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-balance"
          >
            Dilemas éticos y convivencia SENA en vivo con tu ficha
          </h2>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Conecta a los aprendices en una misma sala sincronizada para debatir situaciones reales del Reglamento y construir acuerdos grupales.
          </p>
        </div>

        {session && (
          <button
            type="button"
            onClick={() => {
              setActiveSessionCode(null);
              setSession(null);
            }}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Salir de la sala
          </button>
        )}
      </div>

      {/* Unauthenticated Gate */}
      {!hasParticipantAccess && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 max-w-2xl">
          <div className="flex items-center gap-2.5 text-[#166534] dark:text-emerald-400 mb-3">
            <Radio className="w-5 h-5" />
            <span className="text-sm font-semibold">
              Conexión en tiempo real para la ficha
            </span>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Registra tu documento y ficha para participar en sala (sin cuenta Google)
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            Los aprendices ingresan directamente con su nombre, documento y número de ficha. Los instructores acceden con su usuario y contraseña o cuenta Google para crear y moderar salas.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setOnboardingOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 transition-colors whitespace-nowrap"
            >
              Ingreso Aprendiz (sin Google)
            </button>
            <button
              type="button"
              onClick={() => void signIn()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              Acceso Instructor (Google)
            </button>
          </div>
        </div>
      )}

      {/* Room Lobby */}
      {hasParticipantAccess && !session && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Join Room Card */}
          <div
            className={`${
              isInstructor ? 'lg:col-span-5' : 'lg:col-span-7'
            } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8`}
          >
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Unirse a una sesión en vivo
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Ingresa el código de 6 caracteres proyectado por tu instructor para responder los dilemas de sensibilización en tiempo real.
            </p>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label
                  htmlFor="join-room-code"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Código de sala
                </label>
                <input
                  id="join-room-code"
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Ej. SN4K8P"
                  maxLength={12}
                  className="w-full px-4 py-3 text-base font-mono tracking-widest uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                />
              </div>
              {sessionError && (
                <p className="text-sm text-red-700 dark:text-red-400" role="alert">
                  {sessionError}
                </p>
              )}
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap"
              >
                Conectar a la sesión
              </button>
            </form>
          </div>

          {/* Instructor Create & Manage Sessions */}
          {isInstructor && (
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Crear nueva sala de sensibilización
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Lanza un espacio en tiempo real para tu ficha y controla el avance de cada dilema ético.
                </p>

                <form onSubmit={handleCreateSession} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-12">
                    <label
                      htmlFor="session-title"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Título de la jornada
                    </label>
                    <input
                      id="session-title"
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      maxLength={120}
                      required
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label
                      htmlFor="session-ficha"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Ficha
                    </label>
                    <input
                      id="session-ficha"
                      type="text"
                      value={newFicha}
                      onChange={(e) => setNewFicha(e.target.value)}
                      maxLength={20}
                      required
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label
                      htmlFor="session-code"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Código de sala
                    </label>
                    <input
                      id="session-code"
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      maxLength={12}
                      required
                      className="w-full px-3.5 py-2.5 text-sm font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-12 pt-1">
                    <button
                      type="submit"
                      disabled={creating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      <Radio className="w-4 h-4" />
                      {creating ? 'Creando sala...' : 'Abrir sala en tiempo real'}
                    </button>
                  </div>
                </form>
              </div>

              {mySessions.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Tus sesiones recientes
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {mySessions.slice(0, 5).map((item) => (
                      <div
                        key={item.sessionCode}
                        className="py-3 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            Código: {item.sessionCode} · Ficha {item.ficha} ·{' '}
                            {item.status === 'activa' ? 'Activa' : 'Finalizada'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSessionCode(item.sessionCode)}
                          className="px-3.5 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                        >
                          Abrir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Synchronized Room */}
      {hasParticipantAccess && session && (
        <div className="space-y-6">
          {/* Room Metadata Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <SenaLogo className="w-10 h-10" />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#166534] dark:text-emerald-400">
                    <Radio className="w-3.5 h-3.5" />
                    {session.status === 'activa' ? 'Sesión activa en tiempo real' : 'Sesión finalizada'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Ficha {session.ficha}</span>
                  <span aria-hidden="true">·</span>
                  <span>Instructor: {session.instructorName}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {session.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>{session.totalResponses} respuestas</span>
              </div>

              <button
                type="button"
                onClick={() => void handleCopyCode(session.sessionCode)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                <span>{session.sessionCode}</span>
                {copiedCode ? (
                  <Check className="w-4 h-4 text-[#166534] dark:text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Instructor Live Controls */}
          {isHost && (
            <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleChangeSlide(session.currentSlideIndex - 1)}
                  disabled={session.currentSlideIndex === 0 || session.status !== 'activa'}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                  aria-label="Dilema anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-mono tabular-nums">
                  Dilema 0{session.currentSlideIndex + 1} / 0{SENSITIZATION_DILEMMAS.length}
                </span>
                <button
                  type="button"
                  onClick={() => void handleChangeSlide(session.currentSlideIndex + 1)}
                  disabled={
                    session.currentSlideIndex >= SENSITIZATION_DILEMMAS.length - 1 ||
                    session.status !== 'activa'
                  }
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                  aria-label="Siguiente dilema"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleToggleReveal()}
                  disabled={session.status !== 'activa'}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  {session.revealResults ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Ocultar porcentajes al grupo
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Revelar resultados al grupo
                    </>
                  )}
                </button>

                {session.status === 'activa' && (
                  <button
                    type="button"
                    onClick={() => void handleCloseSession()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Lock className="w-4 h-4" />
                    Finalizar sesión
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main Dilemma Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Dilemma Prompt & Voting / Results */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>{activeDilemma.topic}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeDilemma.regulationRef}</span>
                </div>
                <h4 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  {activeDilemma.title}
                </h4>
                <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                  {activeDilemma.prompt}
                </p>
              </div>

              <form onSubmit={handleSubmitApprenticeVote} className="space-y-4">
                <div className="space-y-2.5">
                  {activeDilemma.options.map((optionText, idx) => {
                    const isSelected = selectedOption === idx;
                    const count = session.tally[idx] || 0;
                    const pct =
                      session.totalResponses > 0
                        ? Math.round((count / session.totalResponses) * 100)
                        : 0;
                    const showBar = session.revealResults || isHost;

                    return (
                      <div key={idx} className="space-y-1.5">
                        <button
                          type="button"
                          disabled={session.status !== 'activa'}
                          onClick={() => setSelectedOption(idx)}
                          className={`w-full text-left p-4 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-[#166534]/10 dark:bg-emerald-950/50 border-[#166534] dark:border-emerald-500 text-slate-900 dark:text-slate-100 font-medium'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          } disabled:cursor-default`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm leading-relaxed">
                              <span className="font-mono font-semibold mr-2">
                                {['A.', 'B.', 'C.', 'D.'][idx]}
                              </span>
                              {optionText}
                            </span>
                            {showBar && (
                              <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums shrink-0">
                                {pct}% ({count})
                              </span>
                            )}
                          </div>
                        </button>
                        {showBar && (
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#39A900] transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {session.status === 'activa' && (
                  <div className="pt-2 space-y-3">
                    <div>
                      <label
                        htmlFor="live-reflection"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Reflexión breve para el debate (opcional, máx. 400 caracteres)
                      </label>
                      <textarea
                        id="live-reflection"
                        value={reflectionInput}
                        onChange={(e) => setReflectionInput(e.target.value)}
                        rows={2}
                        maxLength={400}
                        placeholder="¿Por qué elegiste esa postura frente al Reglamento?"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-[#166534] dark:focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <button
                        type="submit"
                        disabled={selectedOption === null || submittingVote}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#166534] dark:bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-[#14532D] dark:hover:bg-emerald-600 disabled:opacity-40 transition-colors whitespace-nowrap"
                      >
                        <Send className="w-4 h-4" />
                        {submittingVote
                          ? 'Enviando...'
                          : mySavedResponse
                          ? 'Actualizar mi respuesta'
                          : 'Enviar respuesta en vivo'}
                      </button>

                      {mySavedResponse && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#166534] dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Respuesta sincronizada
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </form>

              {(session.revealResults || isHost) && (
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                  <p className="text-xs font-semibold text-[#166534] dark:text-emerald-400 mb-1">
                    Síntesis formativa para la ficha
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {activeDilemma.pedagogicalSynthesis}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Live Reflections Stream */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col">
              {isHost ? (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Aportes en tiempo real de la ficha
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Dilema 0{session.currentSlideIndex + 1} · {currentSlideResponses.length} participaciones
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3 overflow-y-auto max-h-[460px] pr-1">
                    {currentSlideResponses.length === 0 ? (
                      <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                        Esperando respuestas de los aprendices conectados con el código{' '}
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {session.sessionCode}
                        </span>
                        .
                      </div>
                    ) : (
                      currentSlideResponses.map((resp) => (
                        <div
                          key={resp.id || resp.uid}
                          className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {resp.apprenticeName}
                            </span>
                            <span className="font-mono text-[#166534] dark:text-emerald-400 font-medium">
                              Opción {['A', 'B', 'C', 'D'][resp.selectedOption]} · Ficha {resp.ficha}
                            </span>
                          </div>
                          {resp.reflection ? (
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              “{resp.reflection}”
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              Voto registrado sin comentario escrito.
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Dinámica de sensibilización en sala
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Tu voto y tu reflexión ayudan al instructor a identificar cómo interpreta el grupo los deberes y valores del SENA antes de socializar el consenso.
                  </p>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Estado de tu participación
                    </p>
                    <p>
                      {mySavedResponse
                        ? `Ya registraste la opción ${['A', 'B', 'C', 'D'][mySavedResponse.selectedOption]}. Puedes ajustarla mientras la sala siga activa.`
                        : 'Selecciona una alternativa y envía tu respuesta para sumarte al sondeo de la ficha.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
