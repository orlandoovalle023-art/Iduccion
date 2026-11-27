import { Timestamp } from 'firebase/firestore';

export type CompetencyDomain =
  | 'identidad'
  | 'derechosDeberes'
  | 'debidoProceso'
  | 'etapaProductiva';

export type UserRole = 'aprendiz' | 'instructor';
export type DocumentType = 'CC' | 'TI' | 'CE' | 'PPT' | 'NA';
export type CohortJornada = 'Diurna' | 'Mixta' | 'Nocturna' | 'Fines de semana' | 'Virtual';

export interface UserProfile {
  uid: string;
  displayName: string;
  documentType: DocumentType;
  documentNumber: string;
  ficha: string;
  programa: string;
  role: UserRole;
  onboardingCompleted: boolean;
  completedModules: string[];
  xpPoints: number;
  level: number;
  earnedBadges: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CohortGroup {
  fichaCode: string;
  programa: string;
  jornada: CohortJornada;
  status: 'activa' | 'archivada';
  instructorUid: string;
  instructorName: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface AccessLog {
  id?: string;
  uid: string;
  apprenticeName: string;
  documentType: DocumentType;
  documentNumber: string;
  ficha: string;
  programa: string;
  action: 'registro' | 'ingreso';
  createdAt?: Timestamp;
  createdAtMs?: number;
}

export interface DomainScores {
  identidad: number;
  derechosDeberes: number;
  debidoProceso: number;
  etapaProductiva: number;
}

export interface KnowledgeEvaluation {
  id?: string;
  uid: string;
  apprenticeName: string;
  documentNumber: string;
  ficha: string;
  programa: string;
  mode: 'diagnostico' | 'integral';
  totalScore: number;
  correctCount: number;
  questionCount: number;
  domainScores: DomainScores;
  weakestDomain: string;
  xpEarned: number;
  bestStreak: number;
  unlockedBadges: string[];
  createdAt?: Timestamp;
  createdAtMs?: number;
}

export interface InstitutionalVideosConfig {
  anthemVideoId: string;
  anthemTitle: string;
  anthemDescription: string;
  institutionalVideoId: string;
  institutionalTitle: string;
  institutionalDescription: string;
  updatedBy?: string;
  updatedAt?: Timestamp;
}

export interface SensitizationSession {
  sessionCode: string;
  title: string;
  ficha: string;
  instructorUid: string;
  instructorName: string;
  status: 'activa' | 'finalizada';
  currentSlideIndex: number;
  revealResults: boolean;
  tally: [number, number, number, number];
  totalResponses: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdAtMs?: number;
  updatedAtMs?: number;
}

export interface SensitizationResponse {
  id?: string;
  uid: string;
  sessionId: string;
  instructorUid: string;
  apprenticeName: string;
  ficha: string;
  slideIndex: number;
  selectedOption: number;
  reflection: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdAtMs?: number;
  updatedAtMs?: number;
}
