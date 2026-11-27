import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  BOOTSTRAPPED_INSTRUCTOR_EMAIL,
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../lib/firebase';
import {
  CohortGroup,
  DocumentType,
  UserProfile,
} from '../types/sena';
import { computeLevelFromXp } from '../data/senaContent';

interface OnboardingPayload {
  displayName: string;
  documentType: DocumentType;
  documentNumber: string;
  ficha: string;
  programa: string;
}

interface InstructorAuthStatus {
  envConfigured: boolean;
  claimed: boolean;
  ready: boolean;
  loading: boolean;
}

interface AuthContextValue {
  user: User | null;
  apprenticeUid: string | null;
  activeUid: string | null;
  profile: UserProfile | null;
  authReady: boolean;
  isInstructor: boolean;
  isBootstrappedInstructor: boolean;
  isPasswordInstructor: boolean;
  instructorToken: string | null;
  instructorUsername: string | null;
  instructorStatus: InstructorAuthStatus;
  authError: string | null;
  activeCohorts: CohortGroup[];
  onboardingOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;
  refreshInstructorStatus: () => Promise<void>;
  claimInstructorCredentials: (username: string, password: string) => Promise<void>;
  loginInstructor: (username: string, password: string) => Promise<void>;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (data: OnboardingPayload) => Promise<void>;
  updateProfileInfo: (data: OnboardingPayload) => Promise<void>;
  markModuleCompleted: (moduleId: string) => Promise<void>;
  awardEvaluationGamification: (
    xpEarned: number,
    newBadges: string[]
  ) => Promise<void>;
  localCompletedModules: string[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

const APPRENTICE_UID_KEY = 'sena_apprentice_uid';

function generateApprenticeId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `apr_${hex}`;
}

export function isValidApprenticeId(uid?: string | null): boolean {
  return Boolean(
    uid &&
      uid.length >= 16 &&
      uid.length <= 40 &&
      /^apr_[a-zA-Z0-9_\-]+$/.test(uid)
  );
}

export function sanitizeDisplayName(raw?: string | null): string {
  const cleaned = (raw || 'Aprendiz SENA').trim().slice(0, 100);
  return cleaned.length >= 2 ? cleaned : 'Aprendiz SENA';
}

export function sanitizeDocumentNumber(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 20);
  return cleaned.length >= 4 ? cleaned : 'PENDIENTE';
}

export function sanitizeFicha(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 20);
  return cleaned.length >= 4 ? cleaned : '2901000';
}

export function sanitizePrograma(raw: string): string {
  const cleaned = raw.trim().slice(0, 120);
  return cleaned.length >= 3 ? cleaned : 'Formación Titulada SENA';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [apprenticeUid, setApprenticeUid] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(APPRENTICE_UID_KEY);
      return isValidApprenticeId(saved) ? saved : null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [firestoreCohorts, setFirestoreCohorts] = useState<CohortGroup[]>([]);
  const [serverCohorts, setServerCohorts] = useState<CohortGroup[]>([]);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Server-verified instructor session (strictly in React memory, never in localStorage)
  const [instructorToken, setInstructorToken] = useState<string | null>(null);
  const [instructorUsername, setInstructorUsername] = useState<string | null>(null);
  const [instructorStatus, setInstructorStatus] = useState<InstructorAuthStatus>({
    envConfigured: false,
    claimed: false,
    ready: false,
    loading: true,
  });

  const [localCompletedModules, setLocalCompletedModules] = useState<string[]>(
    () => {
      try {
        const saved = localStorage.getItem('sena_completed_modules');
        return saved ? (JSON.parse(saved) as string[]) : [];
      } catch {
        return [];
      }
    }
  );

  const isBootstrappedInstructor = Boolean(
    user?.email &&
      user.emailVerified &&
      user.email.toLowerCase() === BOOTSTRAPPED_INSTRUCTOR_EMAIL.toLowerCase()
  );

  const isPasswordInstructor = Boolean(instructorToken);
  const isInstructor =
    isBootstrappedInstructor || isAdminDoc || isPasswordInstructor;
  const activeUid = user?.uid || apprenticeUid;

  const activeCohorts = React.useMemo(() => {
    const map = new Map<string, CohortGroup>();
    serverCohorts.forEach((c) => map.set(c.fichaCode, c));
    firestoreCohorts.forEach((c) => map.set(c.fichaCode, c));
    return Array.from(map.values()).sort((a, b) =>
      a.fichaCode.localeCompare(b.fichaCode)
    );
  }, [serverCohorts, firestoreCohorts]);

  const refreshInstructorStatus = async () => {
    try {
      const res = await fetch('/api/instructor/status');
      if (res.ok) {
        const data = (await res.json()) as {
          envConfigured?: boolean;
          claimed?: boolean;
          ready?: boolean;
        };
        setInstructorStatus({
          envConfigured: Boolean(data.envConfigured),
          claimed: Boolean(data.claimed),
          ready: Boolean(data.ready),
          loading: false,
        });
        return;
      }
    } catch {
      // Ignore network hiccup
    }
    setInstructorStatus((prev) => ({ ...prev, loading: false }));
  };

  useEffect(() => {
    void refreshInstructorStatus();
  }, []);

  const logAccessEvent = async (
    uid: string,
    payload: {
      apprenticeName: string;
      documentType: DocumentType;
      documentNumber: string;
      ficha: string;
      programa: string;
      action: 'registro' | 'ingreso';
    }
  ) => {
    const bodyPayload = {
      uid,
      apprenticeName: sanitizeDisplayName(payload.apprenticeName),
      documentType: payload.documentType,
      documentNumber: sanitizeDocumentNumber(payload.documentNumber),
      ficha: sanitizeFicha(payload.ficha),
      programa: sanitizePrograma(payload.programa),
      action: payload.action,
    };

    try {
      await fetch('/api/access-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
    } catch {
      // Non-blocking mirror to server store
    }

    try {
      await addDoc(collection(db, 'access_logs'), {
        ...bodyPayload,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'access_logs');
    }
  };

  // Subscribe to active cohorts unconditionally so apprentices can pick their ficha before registering
  useEffect(() => {
    const loadServerCohorts = async () => {
      try {
        const res = await fetch('/api/cohorts/active');
        if (res.ok) {
          const data = (await res.json()) as { cohorts?: CohortGroup[] };
          if (Array.isArray(data.cohorts)) {
            setServerCohorts(data.cohorts);
          }
        }
      } catch {
        // Ignore
      }
    };
    void loadServerCohorts();

    const cohortsQuery = query(
      collection(db, 'cohorts'),
      where('status', '==', 'activa')
    );
    const unsubCohorts = onSnapshot(
      cohortsQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as CohortGroup)
          .sort((a, b) => a.fichaCode.localeCompare(b.fichaCode));
        setFirestoreCohorts(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'cohorts');
      }
    );
    return () => unsubCohorts();
  }, [instructorToken]);

  // Firebase Google Auth listener (Instructors)
  useEffect(() => {
    let unsubGoogleProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubGoogleProfile) {
        unsubGoogleProfile();
        unsubGoogleProfile = null;
      }

      setUser(currentUser);
      setAuthError(null);

      if (!currentUser) {
        setIsAdminDoc(false);
        if (!apprenticeUid) {
          setProfile(null);
        }
        setAuthReady(true);
        return;
      }

      // Google user takes precedence over local apprentice session
      try {
        localStorage.removeItem(APPRENTICE_UID_KEY);
      } catch {
        // Ignore
      }
      setApprenticeUid(null);

      try {
        let adminExists = false;
        if (currentUser.emailVerified) {
          try {
            const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
            adminExists = adminSnap.exists();
          } catch {
            adminExists = false;
          }
        }
        setIsAdminDoc(adminExists);

        const bootstrapped = Boolean(
          currentUser.email &&
            currentUser.emailVerified &&
            currentUser.email.toLowerCase() ===
              BOOTSTRAPPED_INSTRUCTOR_EMAIL.toLowerCase()
        );
        const userIsInstructor = bootstrapped || adminExists;

        const userRef = doc(db, 'users', currentUser.uid);
        const userPath = `users/${currentUser.uid}`;

        if (currentUser.emailVerified) {
          try {
            const existingSnap = await getDoc(userRef);
            if (!existingSnap.exists()) {
              await setDoc(userRef, {
                uid: currentUser.uid,
                displayName: sanitizeDisplayName(currentUser.displayName),
                documentType: 'NA',
                documentNumber: 'PENDIENTE',
                ficha: '2901000',
                programa: userIsInstructor
                  ? 'Coordinación e Instrucción SENA'
                  : 'Formación Titulada SENA',
                role: userIsInstructor ? 'instructor' : 'aprendiz',
                onboardingCompleted: userIsInstructor,
                completedModules: localCompletedModules.slice(0, 12),
                xpPoints: 0,
                level: 1,
                earnedBadges: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, userPath);
          }
        }

        unsubGoogleProfile = onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              setProfile(data);
              if (!userIsInstructor && !data.onboardingCompleted) {
                setOnboardingOpen(true);
              }
            }
            setAuthReady(true);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, userPath);
          }
        );
      } catch (err) {
        setAuthError(
          err instanceof Error ? err.message : 'Error al iniciar sesión'
        );
        setAuthReady(true);
      }
    });

    return () => {
      unsubAuth();
      if (unsubGoogleProfile) unsubGoogleProfile();
    };
  }, []);

  // Local Apprentice Profile Listener (No Google Account required)
  useEffect(() => {
    if (user || !apprenticeUid || !isValidApprenticeId(apprenticeUid)) {
      return;
    }

    const userPath = `users/${apprenticeUid}`;
    const unsub = onSnapshot(
      doc(db, 'users', apprenticeUid),
      (snap) => {
        if (!snap.exists()) {
          try {
            localStorage.removeItem(APPRENTICE_UID_KEY);
          } catch {
            // Ignore
          }
          setApprenticeUid(null);
          setProfile(null);
          return;
        }
        const data = snap.data() as UserProfile;
        setProfile(data);

        if (data.onboardingCompleted) {
          const sessionKey = `sena_access_logged_${apprenticeUid}`;
          try {
            if (!sessionStorage.getItem(sessionKey)) {
              sessionStorage.setItem(sessionKey, '1');
              void logAccessEvent(apprenticeUid, {
                apprenticeName: data.displayName,
                documentType: data.documentType,
                documentNumber: data.documentNumber,
                ficha: data.ficha,
                programa: data.programa,
                action: 'ingreso',
              });
            }
          } catch {
            // Ignore
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, userPath);
      }
    );

    return () => unsub();
  }, [user, apprenticeUid]);

  const claimInstructorCredentials = async (
    username: string,
    password: string
  ) => {
    setAuthError(null);
    const res = await fetch('/api/instructor/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    const data = (await res.json()) as {
      token?: string;
      username?: string;
      error?: string;
    };
    if (!res.ok || !data.token) {
      throw new Error(
        data.error || 'No se pudieron configurar las credenciales de instructor.'
      );
    }
    try {
      localStorage.removeItem(APPRENTICE_UID_KEY);
    } catch {
      // Ignore
    }
    setApprenticeUid(null);
    setProfile(null);
    setInstructorToken(data.token);
    setInstructorUsername(data.username || username.trim());
    setInstructorStatus((prev) => ({ ...prev, claimed: true, ready: true }));
    setOnboardingOpen(false);
  };

  const loginInstructor = async (username: string, password: string) => {
    setAuthError(null);
    const res = await fetch('/api/instructor/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    const data = (await res.json()) as {
      token?: string;
      username?: string;
      error?: string;
    };
    if (!res.ok || !data.token) {
      throw new Error(data.error || 'Usuario o contraseña incorrectos.');
    }
    try {
      localStorage.removeItem(APPRENTICE_UID_KEY);
    } catch {
      // Ignore
    }
    setApprenticeUid(null);
    setProfile(null);
    setInstructorToken(data.token);
    setInstructorUsername(data.username || username.trim());
    setOnboardingOpen(false);
  };

  // Google Sign-In for Instructors
  const signIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setOnboardingOpen(false);
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: string }).code)
          : '';
      if (code === 'auth/popup-blocked') {
        setAuthError(
          'El navegador bloqueó la ventana de inicio de sesión con Google. Permite las ventanas emergentes para este sitio e inténtalo nuevamente.'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthError(
          'Cerraste la ventana de Google antes de completar el acceso como instructor.'
        );
      } else {
        const message =
          error instanceof Error
            ? error.message
            : 'No fue posible completar el inicio de sesión.';
        setAuthError(message);
      }
    }
  };

  const logout = async () => {
    setAuthError(null);
    setOnboardingOpen(false);
    setInstructorToken(null);
    setInstructorUsername(null);
    try {
      localStorage.removeItem(APPRENTICE_UID_KEY);
    } catch {
      // Ignore
    }
    setApprenticeUid(null);
    setProfile(null);
    if (auth.currentUser) {
      await signOut(auth);
    }
  };

  // Apprentice Registration / Login without Google (direct Firestore profile with unguessable apr_ ID)
  const completeOnboarding = async (data: OnboardingPayload) => {
    const cleanName = sanitizeDisplayName(data.displayName);
    const cleanDocNum = sanitizeDocumentNumber(data.documentNumber);
    const cleanFicha = sanitizeFicha(data.ficha);
    const cleanPrograma = sanitizePrograma(data.programa);

    let targetUid = user?.uid || apprenticeUid;
    let isNewApprentice = false;

    if (!targetUid || !isValidApprenticeId(targetUid)) {
      if (!user) {
        targetUid = generateApprenticeId();
        isNewApprentice = true;
      }
    }

    if (!targetUid) return;

    const userPath = `users/${targetUid}`;
    const userRef = doc(db, 'users', targetUid);

    try {
      if (isNewApprentice) {
        await setDoc(userRef, {
          uid: targetUid,
          displayName: cleanName,
          documentType: data.documentType,
          documentNumber: cleanDocNum,
          ficha: cleanFicha,
          programa: cleanPrograma,
          role: 'aprendiz',
          onboardingCompleted: true,
          completedModules: localCompletedModules.slice(0, 12),
          xpPoints: 0,
          level: 1,
          earnedBadges: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        try {
          localStorage.setItem(APPRENTICE_UID_KEY, targetUid);
        } catch {
          // Ignore
        }
        setApprenticeUid(targetUid);
      } else {
        await updateDoc(userRef, {
          displayName: cleanName,
          documentType: data.documentType,
          documentNumber: cleanDocNum,
          ficha: cleanFicha,
          programa: cleanPrograma,
          onboardingCompleted: true,
          updatedAt: serverTimestamp(),
        });
      }

      const sessionKey = `sena_access_logged_${targetUid}`;
      try {
        sessionStorage.setItem(sessionKey, '1');
      } catch {
        // Ignore
      }

      await logAccessEvent(targetUid, {
        apprenticeName: cleanName,
        documentType: data.documentType,
        documentNumber: cleanDocNum,
        ficha: cleanFicha,
        programa: cleanPrograma,
        action: 'registro',
      });

      setOnboardingOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  };

  const updateProfileInfo = async (data: OnboardingPayload) => {
    if (!activeUid || !profile) return;
    const userPath = `users/${activeUid}`;
    try {
      await updateDoc(doc(db, 'users', activeUid), {
        displayName: sanitizeDisplayName(data.displayName),
        documentType: data.documentType,
        documentNumber: sanitizeDocumentNumber(data.documentNumber),
        ficha: sanitizeFicha(data.ficha),
        programa: sanitizePrograma(data.programa),
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  };

  const markModuleCompleted = async (moduleId: string) => {
    const cleanId = moduleId.trim().slice(0, 60);
    if (!cleanId) return;

    setLocalCompletedModules((prev) => {
      const next = prev.includes(cleanId)
        ? prev
        : [...prev, cleanId].slice(0, 12);
      try {
        localStorage.setItem('sena_completed_modules', JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });

    if (activeUid && profile) {
      if (profile.completedModules.includes(cleanId)) return;
      const nextModules = [...profile.completedModules, cleanId].slice(0, 12);
      const nextXp = Math.min(100000, (profile.xpPoints || 0) + 50);
      const nextLevel = computeLevelFromXp(nextXp).level;
      const userPath = `users/${activeUid}`;
      try {
        await updateDoc(doc(db, 'users', activeUid), {
          completedModules: nextModules,
          xpPoints: nextXp,
          level: nextLevel,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, userPath);
      }
    }
  };

  const awardEvaluationGamification = async (
    xpEarned: number,
    newBadges: string[]
  ) => {
    if (!activeUid || !profile) return;
    const safeXpDelta = Math.max(0, Math.min(2000, Math.round(xpEarned)));
    const nextXp = Math.min(100000, (profile.xpPoints || 0) + safeXpDelta);
    const nextLevel = computeLevelFromXp(nextXp).level;
    const mergedBadges = Array.from(
      new Set([...(profile.earnedBadges || []), ...newBadges])
    ).slice(0, 10);

    const userPath = `users/${activeUid}`;
    try {
      await updateDoc(doc(db, 'users', activeUid), {
        xpPoints: nextXp,
        level: nextLevel,
        earnedBadges: mergedBadges,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        apprenticeUid,
        activeUid,
        profile,
        authReady,
        isInstructor,
        isBootstrappedInstructor,
        isPasswordInstructor,
        instructorToken,
        instructorUsername,
        instructorStatus,
        authError,
        activeCohorts,
        onboardingOpen,
        setOnboardingOpen,
        refreshInstructorStatus,
        claimInstructorCredentials,
        loginInstructor,
        signIn,
        logout,
        completeOnboarding,
        updateProfileInfo,
        markModuleCompleted,
        awardEvaluationGamification,
        localCompletedModules: profile
          ? profile.completedModules
          : localCompletedModules,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe utilizarse dentro de AuthProvider');
  return ctx;
}
