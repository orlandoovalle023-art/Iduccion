import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

interface ClaimedInstructorCredential {
  username: string;
  salt: string;
  hashHex: string;
}

interface StoredEvaluation {
  id: string;
  uid: string;
  apprenticeName: string;
  documentNumber: string;
  ficha: string;
  programa: string;
  mode: 'diagnostico' | 'integral';
  totalScore: number;
  correctCount: number;
  questionCount: number;
  domainScores: {
    identidad: number;
    derechosDeberes: number;
    debidoProceso: number;
    etapaProductiva: number;
  };
  weakestDomain: string;
  xpEarned: number;
  bestStreak: number;
  unlockedBadges: string[];
  createdAtMs: number;
}

interface StoredAccessLog {
  id: string;
  uid: string;
  apprenticeName: string;
  documentType: 'CC' | 'TI' | 'CE' | 'PPT' | 'NA';
  documentNumber: string;
  ficha: string;
  programa: string;
  action: 'registro' | 'ingreso';
  createdAtMs: number;
}

interface StoredCohort {
  fichaCode: string;
  programa: string;
  jornada: 'Diurna' | 'Mixta' | 'Nocturna' | 'Fines de semana' | 'Virtual';
  status: 'activa' | 'archivada';
  instructorUid: string;
  instructorName: string;
  createdAtMs: number;
  updatedAtMs: number;
}

interface StoredVideoSettings {
  anthemVideoId: string;
  anthemTitle: string;
  anthemDescription: string;
  institutionalVideoId: string;
  institutionalTitle: string;
  institutionalDescription: string;
  updatedBy: string;
  updatedAtMs: number;
}

interface StoredSensitizationResponse {
  id: string;
  uid: string;
  sessionId: string;
  instructorUid: string;
  apprenticeName: string;
  ficha: string;
  slideIndex: number;
  selectedOption: number;
  reflection: string;
  createdAtMs: number;
  updatedAtMs: number;
}

interface StoredSensitizationSession {
  sessionCode: string;
  title: string;
  ficha: string;
  instructorUid: string;
  instructorName: string;
  status: 'activa' | 'finalizada';
  currentSlideIndex: number;
  revealResults: boolean;
  tally: number[];
  totalResponses: number;
  createdAtMs: number;
  updatedAtMs: number;
}

let claimedCredential: ClaimedInstructorCredential | null = null;
const evaluationsStore: StoredEvaluation[] = [];
const accessLogsStore: StoredAccessLog[] = [];
const cohortsStore = new Map<string, StoredCohort>();
let videosStore: StoredVideoSettings | null = null;
const sessionsStore = new Map<string, StoredSensitizationSession>();
const sessionResponsesStore = new Map<string, StoredSensitizationResponse[]>();

function isEnvInstructorConfigured(): boolean {
  return Boolean(
    process.env.INSTRUCTOR_PASSCODE &&
      process.env.INSTRUCTOR_PASSCODE.trim().length > 0
  );
}

function hashPasscode(passcode: string, saltHex: string): Buffer {
  return crypto.scryptSync(passcode, saltHex, 64);
}

function timingSafeTextEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function issueInstructorToken(username: string): string {
  const payload = {
    role: 'instructor',
    username,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  );
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifyInstructorToken(
  token: string
): { username: string; role: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  if (!timingSafeTextEqual(sigB64, expectedSig)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as { role?: string; username?: string; exp?: number };
    if (
      parsed.role !== 'instructor' ||
      typeof parsed.username !== 'string' ||
      typeof parsed.exp !== 'number' ||
      parsed.exp < Date.now()
    ) {
      return null;
    }
    return { username: parsed.username, role: parsed.role };
  } catch {
    return null;
  }
}

interface AuthedRequest extends Request {
  instructor?: { username: string; role: string };
}

function requireInstructorAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acceso de instructor requerido.' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const verified = verifyInstructorToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Sesión de instructor inválida o expirada.' });
    return;
  }
  req.instructor = verified;
  next();
}

function cleanStr(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function cleanId(val: unknown, maxLen = 128): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, maxLen);
}

function cleanCode(val: unknown, maxLen = 20): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[^a-zA-Z0-9\-]/g, '').slice(0, maxLen);
}

function clampInt(val: unknown, min: number, max: number): number {
  const n = typeof val === 'number' ? Math.round(val) : Number(val);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function recomputeSessionTally(sessionCode: string): void {
  const session = sessionsStore.get(sessionCode);
  if (!session) return;
  const responses = sessionResponsesStore.get(sessionCode) || [];
  const tally = [0, 0, 0, 0];
  let total = 0;
  for (const r of responses) {
    if (r.slideIndex === session.currentSlideIndex) {
      if (r.selectedOption >= 0 && r.selectedOption <= 3) {
        tally[r.selectedOption] += 1;
        total += 1;
      }
    }
  }
  session.tally = tally;
  session.totalResponses = total;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // Instructor Auth Status
  app.get('/api/instructor/status', (_req: Request, res: Response) => {
    const envConfigured = isEnvInstructorConfigured();
    res.json({
      envConfigured,
      claimed: Boolean(claimedCredential),
      ready: envConfigured || Boolean(claimedCredential),
    });
  });

  // One-time First-Run Claim (only when env vars are not set and no claim exists yet)
  app.post('/api/instructor/claim', (req: Request, res: Response) => {
    if (isEnvInstructorConfigured() || claimedCredential) {
      res.status(409).json({
        error: 'Las credenciales de instructor ya fueron configuradas.',
      });
      return;
    }

    const username = cleanStr(req.body?.username, 60);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (username.length < 2 || password.length < 3 || password.length > 128) {
      res.status(400).json({
        error:
          'Ingresa un usuario (mín. 2 caracteres) y una contraseña (mín. 3 caracteres).',
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashHex = hashPasscode(password, salt).toString('hex');
    claimedCredential = { username, salt, hashHex };

    const token = issueInstructorToken(username);
    res.json({ token, username });
  });

  // Instructor Login
  app.post('/api/instructor/login', (req: Request, res: Response) => {
    const username = cleanStr(req.body?.username, 60);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      res.status(400).json({ error: 'Ingresa usuario y contraseña.' });
      return;
    }

    if (isEnvInstructorConfigured()) {
      const envPass = process.env.INSTRUCTOR_PASSCODE || '';
      const envUser = process.env.INSTRUCTOR_USERNAME?.trim();
      const userMatches = envUser
        ? timingSafeTextEqual(username.toLowerCase(), envUser.toLowerCase())
        : username.length >= 2;
      const passMatches = timingSafeTextEqual(password, envPass);
      if (!userMatches || !passMatches) {
        res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
        return;
      }
      const token = issueInstructorToken(envUser || username);
      res.json({ token, username: envUser || username });
      return;
    }

    if (!claimedCredential) {
      res.status(409).json({
        error:
          'Aún no se han configurado credenciales iniciales de instructor en esta sesión.',
      });
      return;
    }

    const expectedHash = Buffer.from(claimedCredential.hashHex, 'hex');
    const actualHash = hashPasscode(password, claimedCredential.salt);
    const userOk = timingSafeTextEqual(
      username.toLowerCase(),
      claimedCredential.username.toLowerCase()
    );
    const passOk =
      expectedHash.length === actualHash.length &&
      crypto.timingSafeEqual(expectedHash, actualHash);

    if (!userOk || !passOk) {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
      return;
    }

    const token = issueInstructorToken(claimedCredential.username);
    res.json({ token, username: claimedCredential.username });
  });

  // Verify token validity
  app.get(
    '/api/instructor/session',
    requireInstructorAuth,
    (req: AuthedRequest, res: Response) => {
      res.json({
        authenticated: true,
        username: req.instructor?.username || 'Instructor',
      });
    }
  );

  // Public / Apprentice + Instructor: Active Cohorts
  app.get('/api/cohorts/active', (_req: Request, res: Response) => {
    const list = Array.from(cohortsStore.values())
      .filter((c) => c.status === 'activa')
      .sort((a, b) => a.fichaCode.localeCompare(b.fichaCode));
    res.json({ cohorts: list });
  });

  // Instructor: List all cohorts
  app.get(
    '/api/cohorts',
    requireInstructorAuth,
    (_req: AuthedRequest, res: Response) => {
      const list = Array.from(cohortsStore.values()).sort((a, b) =>
        a.fichaCode.localeCompare(b.fichaCode)
      );
      res.json({ cohorts: list });
    }
  );

  // Instructor: Create cohort
  app.post(
    '/api/cohorts',
    requireInstructorAuth,
    (req: AuthedRequest, res: Response) => {
      const fichaCode = cleanCode(req.body?.fichaCode, 20);
      const programa = cleanStr(req.body?.programa, 120);
      const validJornadas = [
        'Diurna',
        'Mixta',
        'Nocturna',
        'Fines de semana',
        'Virtual',
      ] as const;
      const jornada = validJornadas.includes(req.body?.jornada)
        ? (req.body.jornada as StoredCohort['jornada'])
        : 'Diurna';

      if (fichaCode.length < 4 || programa.length < 3) {
        res.status(400).json({ error: 'Datos de ficha o programa inválidos.' });
        return;
      }

      if (cohortsStore.has(fichaCode)) {
        res.status(409).json({ error: `La ficha ${fichaCode} ya existe.` });
        return;
      }

      const now = Date.now();
      const cohort: StoredCohort = {
        fichaCode,
        programa,
        jornada,
        status: 'activa',
        instructorUid: `inst_${cleanId(req.instructor?.username || 'sena', 40)}`,
        instructorName: cleanStr(
          req.body?.instructorName || req.instructor?.username || 'Instructor SENA',
          100
        ),
        createdAtMs: now,
        updatedAtMs: now,
      };
      cohortsStore.set(fichaCode, cohort);
      res.status(201).json({ cohort });
    }
  );

  // Instructor: Update cohort status
  app.patch(
    '/api/cohorts/:fichaCode',
    requireInstructorAuth,
    (req: AuthedRequest, res: Response) => {
      const fichaCode = cleanCode(req.params.fichaCode, 20);
      const existing = cohortsStore.get(fichaCode);
      if (!existing) {
        res.status(404).json({ error: 'Ficha no encontrada.' });
        return;
      }
      const nextStatus =
        req.body?.status === 'archivada' ? 'archivada' : 'activa';
      existing.status = nextStatus;
      existing.updatedAtMs = Date.now();
      res.json({ cohort: existing });
    }
  );

  // Public: Get videos config
  app.get('/api/videos', (_req: Request, res: Response) => {
    res.json({ videos: videosStore });
  });

  // Instructor: Save videos config
  app.put(
    '/api/videos',
    requireInstructorAuth,
    (req: AuthedRequest, res: Response) => {
      const anthemVideoId = cleanId(req.body?.anthemVideoId, 20);
      const institutionalVideoId = cleanId(req.body?.institutionalVideoId, 20);
      const anthemTitle = cleanStr(req.body?.anthemTitle, 120);
      const anthemDescription = cleanStr(req.body?.anthemDescription, 300);
      const institutionalTitle = cleanStr(req.body?.institutionalTitle, 120);
      const institutionalDescription = cleanStr(
        req.body?.institutionalDescription,
        300
      );

      if (
        anthemVideoId.length < 6 ||
        institutionalVideoId.length < 6 ||
        anthemTitle.length < 3 ||
        institutionalTitle.length < 3
      ) {
        res.status(400).json({ error: 'Configuración de videos inválida.' });
        return;
      }

      videosStore = {
        anthemVideoId,
        anthemTitle,
        anthemDescription,
        institutionalVideoId,
        institutionalTitle,
        institutionalDescription,
        updatedBy: req.instructor?.username || 'Instructor',
        updatedAtMs: Date.now(),
      };
      res.json({ videos: videosStore });
    }
  );

  // Apprentice: Record access log
  app.post('/api/access-logs', (req: Request, res: Response) => {
    const uid = cleanId(req.body?.uid, 60) || `apr_${crypto.randomBytes(8).toString('hex')}`;
    const apprenticeName = cleanStr(req.body?.apprenticeName, 100);
    const validDocTypes = ['CC', 'TI', 'CE', 'PPT', 'NA'] as const;
    const documentType = validDocTypes.includes(req.body?.documentType)
      ? (req.body.documentType as StoredAccessLog['documentType'])
      : 'CC';
    const documentNumber = cleanCode(req.body?.documentNumber, 20);
    const ficha = cleanCode(req.body?.ficha, 20);
    const programa = cleanStr(req.body?.programa, 120);
    const action = req.body?.action === 'registro' ? 'registro' : 'ingreso';

    if (apprenticeName.length < 2 || documentNumber.length < 4 || ficha.length < 4) {
      res.status(400).json({ error: 'Datos de identificación incompletos.' });
      return;
    }

    const entry: StoredAccessLog = {
      id: `log_${crypto.randomBytes(8).toString('hex')}`,
      uid,
      apprenticeName,
      documentType,
      documentNumber,
      ficha,
      programa: programa || 'Formación Titulada SENA',
      action,
      createdAtMs: Date.now(),
    };
    accessLogsStore.unshift(entry);
    if (accessLogsStore.length > 500) {
      accessLogsStore.length = 500;
    }
    res.status(201).json({ log: entry });
  });

  // Instructor: List access logs
  app.get(
    '/api/access-logs',
    requireInstructorAuth,
    (_req: AuthedRequest, res: Response) => {
      res.json({ logs: accessLogsStore });
    }
  );

  // Apprentice: Record evaluation
  app.post('/api/evaluations', (req: Request, res: Response) => {
    const id = cleanId(req.body?.id, 60) || `eval_${crypto.randomBytes(8).toString('hex')}`;
    const uid = cleanId(req.body?.uid, 60);
    const apprenticeName = cleanStr(req.body?.apprenticeName, 100);
    const documentNumber = cleanCode(req.body?.documentNumber, 20);
    const ficha = cleanCode(req.body?.ficha, 20);
    const programa = cleanStr(req.body?.programa, 120);
    const mode = req.body?.mode === 'integral' ? 'integral' : 'diagnostico';
    const questionCount = clampInt(req.body?.questionCount, 1, 20);
    const correctCount = clampInt(req.body?.correctCount, 0, questionCount);
    const totalScore = clampInt(req.body?.totalScore, 0, 100);
    const xpEarned = clampInt(req.body?.xpEarned, 0, 2000);
    const bestStreak = clampInt(req.body?.bestStreak, 0, 20);
    const weakestDomain = cleanStr(req.body?.weakestDomain, 40) || 'identidad';

    const rawDomains = req.body?.domainScores || {};
    const domainScores = {
      identidad: clampInt(rawDomains.identidad, 0, 100),
      derechosDeberes: clampInt(rawDomains.derechosDeberes, 0, 100),
      debidoProceso: clampInt(rawDomains.debidoProceso, 0, 100),
      etapaProductiva: clampInt(rawDomains.etapaProductiva, 0, 100),
    };

    const unlockedBadges = Array.isArray(req.body?.unlockedBadges)
      ? req.body.unlockedBadges
          .filter((b: unknown): b is string => typeof b === 'string')
          .map((b: string) => b.trim().slice(0, 40))
          .slice(0, 10)
      : [];

    if (!uid || apprenticeName.length < 2 || ficha.length < 4) {
      res.status(400).json({ error: 'Datos de evaluación inválidos.' });
      return;
    }

    const entry: StoredEvaluation = {
      id,
      uid,
      apprenticeName,
      documentNumber: documentNumber || 'PENDIENTE',
      ficha,
      programa: programa || 'Formación Titulada SENA',
      mode,
      totalScore,
      correctCount,
      questionCount,
      domainScores,
      weakestDomain,
      xpEarned,
      bestStreak,
      unlockedBadges,
      createdAtMs: Date.now(),
    };
    evaluationsStore.unshift(entry);
    if (evaluationsStore.length > 500) {
      evaluationsStore.length = 500;
    }
    res.status(201).json({ evaluation: entry });
  });

  // Instructor: List all evaluations
  app.get(
    '/api/evaluations',
    requireInstructorAuth,
    (_req: AuthedRequest, res: Response) => {
      res.json({ evaluations: evaluationsStore });
    }
  );

  // Instructor: Delete single evaluation
  app.delete(
    '/api/evaluations/:id',
    requireInstructorAuth,
    (req: AuthedRequest, res: Response) => {
      const targetId = cleanId(req.params.id, 60);
      const idx = evaluationsStore.findIndex((e) => e.id === targetId);
      if (idx === -1) {
        res.status(404).json({ error: 'Evaluación no encontrada.' });
        return;
      }
      evaluationsStore.splice(idx, 1);
      res.json({ deleted: targetId });
    }
  );

  // Instructor: Bulk delete evaluations
  app.post(
    '/api/evaluations/bulk-delete',
    requireInstructorAuth,
    (req: AuthedRequest, res: Response) => {
      const rawIds: unknown[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const idSet = new Set(
        rawIds
          .filter((v): v is string => typeof v === 'string')
          .map((v) => cleanId(v, 60))
          .filter(Boolean)
      );
      if (idSet.size === 0) {
        res.status(400).json({ error: 'No se recibieron IDs válidos.' });
        return;
      }
      let removed = 0;
      for (let i = evaluationsStore.length - 1; i >= 0; i -= 1) {
        if (idSet.has(evaluationsStore[i].id)) {
          evaluationsStore.splice(i, 1);
          removed += 1;
        }
      }
      res.json({ removed });
    }
  );

  // Live Sensitization Sessions
  app.get(
    '/api/sessions',
    requireInstructorAuth,
    (_req: AuthedRequest, res: Response) => {
      const list = Array.from(sessionsStore.values()).sort(
        (a, b) => b.createdAtMs - a.createdAtMs
      );
      res.json({ sessions: list });
    }
  );

  app.get('/api/sessions/:code', (req: Request, res: Response) => {
    const code = cleanId(req.params.code, 12).toUpperCase();
    const session = sessionsStore.get(code);
    if (!session) {
      res.status(404).json({ error: 'Sala no encontrada.' });
      return;
    }
    res.json({ session });
  });

  app.post(
    '/api/sessions',
    requireInstructorAuth,
    (req: AuthedRequest, res: Response) => {
      const sessionCode = cleanId(req.body?.sessionCode, 12).toUpperCase();
      const title = cleanStr(req.body?.title, 120);
      const ficha = cleanCode(req.body?.ficha, 20);
      if (sessionCode.length < 6 || title.length < 3 || ficha.length < 4) {
        res.status(400).json({ error: 'Datos de sala inválidos.' });
        return;
      }
      const now = Date.now();
      const session: StoredSensitizationSession = {
        sessionCode,
        title,
        ficha,
        instructorUid: `inst_${cleanId(req.instructor?.username || 'sena', 40)}`,
        instructorName: cleanStr(
          req.body?.instructorName || req.instructor?.username || 'Instructor SENA',
          100
        ),
        status: 'activa',
        currentSlideIndex: 0,
        revealResults: false,
        tally: [0, 0, 0, 0],
        totalResponses: 0,
        createdAtMs: now,
        updatedAtMs: now,
      };
      sessionsStore.set(sessionCode, session);
      if (!sessionResponsesStore.has(sessionCode)) {
        sessionResponsesStore.set(sessionCode, []);
      }
      res.status(201).json({ session });
    }
  );

  app.patch(
    '/api/sessions/:code',
    requireInstructorAuth,
    (req: AuthedRequest, res: Response) => {
      const code = cleanId(req.params.code, 12).toUpperCase();
      const session = sessionsStore.get(code);
      if (!session) {
        res.status(404).json({ error: 'Sala no encontrada.' });
        return;
      }
      if (typeof req.body?.currentSlideIndex === 'number') {
        session.currentSlideIndex = clampInt(req.body.currentSlideIndex, 0, 20);
        session.revealResults = false;
        recomputeSessionTally(code);
      }
      if (typeof req.body?.revealResults === 'boolean') {
        session.revealResults = req.body.revealResults;
      }
      if (req.body?.status === 'finalizada' || req.body?.status === 'activa') {
        session.status = req.body.status;
      }
      session.updatedAtMs = Date.now();
      res.json({ session });
    }
  );

  app.get(
    '/api/sessions/:code/responses',
    requireInstructorAuth,
    (req: AuthedRequest, res: Response) => {
      const code = cleanId(req.params.code, 12).toUpperCase();
      const list = sessionResponsesStore.get(code) || [];
      res.json({ responses: list });
    }
  );

  app.post('/api/sessions/:code/responses', (req: Request, res: Response) => {
    const code = cleanId(req.params.code, 12).toUpperCase();
    const session = sessionsStore.get(code);
    if (!session) {
      res.status(404).json({ error: 'Sala no encontrada.' });
      return;
    }
    if (session.status !== 'activa') {
      res.status(409).json({ error: 'La sala ya fue finalizada.' });
      return;
    }

    const uid = cleanId(req.body?.uid, 60);
    const apprenticeName = cleanStr(req.body?.apprenticeName, 100);
    const ficha = cleanCode(req.body?.ficha, 20);
    const slideIndex = clampInt(req.body?.slideIndex, 0, 20);
    const selectedOption = clampInt(req.body?.selectedOption, 0, 3);
    const reflection = cleanStr(req.body?.reflection, 400);

    if (!uid || apprenticeName.length < 2 || ficha.length < 4) {
      res.status(400).json({ error: 'Respuesta inválida.' });
      return;
    }

    const list = sessionResponsesStore.get(code) || [];
    const responseId = `${uid}_${slideIndex}`;
    const now = Date.now();
    const existingIdx = list.findIndex((r) => r.id === responseId);
    const item: StoredSensitizationResponse = {
      id: responseId,
      uid,
      sessionId: code,
      instructorUid: session.instructorUid,
      apprenticeName,
      ficha,
      slideIndex,
      selectedOption,
      reflection,
      createdAtMs: existingIdx >= 0 ? list[existingIdx].createdAtMs : now,
      updatedAtMs: now,
    };

    if (existingIdx >= 0) {
      list[existingIdx] = item;
    } else {
      list.unshift(item);
    }
    sessionResponsesStore.set(code, list);
    recomputeSessionTally(code);
    session.updatedAtMs = now;

    res.json({ response: item, session });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Inducción SENA server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
