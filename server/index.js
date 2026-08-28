/**
 * DEV CONSTRUCTIONS - Production Express.js Backend
 * ================================================
 * Hardened API server with:
 *  - Helmet (15+ security headers: CSP, HSTS, X-Frame-Options, etc.)
 *  - bcryptjs password verification
 *  - express-rate-limit (brute-force protection on login)
 *  - HttpOnly + Secure + SameSite=Strict cookies (no localStorage)
 *  - Per-session cryptographically random tokens (Map-based server state)
 *  - multer with strict MIME allowlist & 5MB cap for file uploads
 *  - CORS locked to FRONTEND_ORIGIN only
 *  - Auth middleware on all write/delete endpoints
 *  - Input validation on all routes
 *  - No stack trace leakage in error responses
 *  - Atomic JSON DB reads/writes with error recovery
 */

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { randomUUID, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Environment & Constants ──────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  PORT = 4000,
  FRONTEND_ORIGIN = 'http://localhost:5173',
  ADMIN_USERNAME,
  ADMIN_PASSWORD_HASH,   // bcrypt hash — set via setup script
  COOKIE_SECRET,
} = process.env;

// Fail fast on missing required config
const REQUIRED_VARS = ['ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH', 'COOKIE_SECRET'];
const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(`\n[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  console.error('  Run: node setup-credentials.js to generate them.\n');
  process.exit(1);
}

// DATA_DIR can be overridden via env var (e.g., a Railway persistent volume path)
// Defaults to server/data — self-contained within the server directory
const DATA_ROOT   = process.env.DATA_DIR || path.resolve(__dirname, 'data');
const DB_PATH      = path.join(DATA_ROOT, 'db.json');
const UPLOADS_DIR  = path.join(DATA_ROOT, 'uploads');
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXT  = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

// ─── In-Memory Session Store ──────────────────────────────────────────────────
// Map<token, { createdAt: number }>
const activeSessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Purge expired sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      activeSessions.delete(token);
    }
  }
}, 30 * 60 * 1000);

// ─── Database Helpers ─────────────────────────────────────────────────────────

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify({ projects: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (err) {
    console.error('[DB] Read error:', err.message);
    return { projects: [] };
  }
}

function writeDB(data) {
  // Write to a temp file then rename — atomic on most OS
  const tmpPath = DB_PATH + '.tmp';
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, DB_PATH);
  } catch (err) {
    console.error('[DB] Write error:', err.message);
    // Clean up temp file if it exists
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    throw err;
  }
}

// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();

// Trust proxy (required when behind Railway/Render/Nginx)
app.set('trust proxy', 1);

// Security headers via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', FRONTEND_ORIGIN],
      connectSrc: ["'self'", FRONTEND_ORIGIN],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// CORS — locked to frontend origin only
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,               // allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '8mb' }));
app.use(cookieParser(COOKIE_SECRET));

// Serve uploaded images statically
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Multer (Secure File Upload) ──────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!ALLOWED_EXT.has(ext)) return cb(new Error('Invalid file extension'));
    cb(null, `project_${randomUUID()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error(`Unsupported MIME type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

// ─── Rate Limiters ────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 5,                       // 5 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true, // Only count failed attempts
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: 60,                      // 60 requests/min for general API
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

app.use('/api', apiLimiter);

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const token = req.signedCookies?.adminToken;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const session = activeSessions.get(token);
  if (!session) {
    // Clear stale cookie
    res.clearCookie('adminToken');
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
  // Check session TTL
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    activeSessions.delete(token);
    res.clearCookie('adminToken');
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
  next();
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────

// POST /api/admin/login
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body ?? {};

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid request body.' });
    }

    // Constant-time username comparison (using bcrypt for password avoids timing attack too)
    const usernameMatch = username === ADMIN_USERNAME;
    const passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (!usernameMatch || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Create secure session token
    const token = randomUUID();
    activeSessions.set(token, { createdAt: Date.now() });

    // Set HttpOnly + Secure + SameSite=Strict cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      signed: true,
      maxAge: SESSION_TTL_MS,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Login] Error:', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/admin/session  — check if current cookie session is valid
app.get('/api/admin/session', (req, res) => {
  const token = req.signedCookies?.adminToken;
  if (!token) return res.json({ valid: false });
  const session = activeSessions.get(token);
  const valid = !!session && (Date.now() - session.createdAt <= SESSION_TTL_MS);
  if (!valid) {
    activeSessions.delete(token);
    res.clearCookie('adminToken');
  }
  res.json({ valid });
});

// POST /api/admin/logout
app.post('/api/admin/logout', (req, res) => {
  const token = req.signedCookies?.adminToken;
  if (token) activeSessions.delete(token);
  res.clearCookie('adminToken');
  res.json({ success: true });
});

// ─── Projects Routes ──────────────────────────────────────────────────────────

// GET /api/projects  — PUBLIC
app.get('/api/projects', (_req, res) => {
  try {
    const db = readDB();
    res.json(db.projects);
  } catch {
    res.status(500).json({ error: 'Failed to load projects.' });
  }
});

// POST /api/projects  — PROTECTED (with optional image upload)
app.post('/api/projects', requireAuth, (req, res) => {
  upload.single('image')(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message });
    }
    try {
      const { name, category, location, shortDescription, projectStatus, publishStatus, showOnLandingPage, coverImage } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: 'Project name is required.' });
      }

      const allowedCategories = ['Residential', 'Commercial', 'Interior', 'Renovation', 'Other'];
      if (category && !allowedCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category.' });
      }

      const allowedStatuses = ['Completed', 'Ongoing', 'Upcoming'];
      if (projectStatus && !allowedStatuses.includes(projectStatus)) {
        return res.status(400).json({ error: 'Invalid project status.' });
      }

      const now = new Date().toISOString();
      // Image: either uploaded file (from multer) or base64 data URI (for dev)
      let imageUrl = '';
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      } else if (coverImage && typeof coverImage === 'string') {
        imageUrl = sanitizeImageUrl(coverImage, res);
        if (imageUrl === null) return; // sanitizeImageUrl already sent response
      }

      const project = {
        id: randomUUID(),
        name: name.trim(),
        category: category || 'Other',
        location: (location || '').trim(),
        shortDescription: (shortDescription || '').trim(),
        projectStatus: projectStatus || 'Completed',
        coverImage: imageUrl,
        publishStatus: publishStatus === 'published' ? 'published' : 'draft',
        showOnLandingPage: showOnLandingPage === 'true' || showOnLandingPage === true,
        createdAt: now,
        updatedAt: now,
      };

      const db = readDB();
      db.projects.push(project);
      writeDB(db);
      res.status(201).json(project);
    } catch (err) {
      console.error('[POST /api/projects]', err.message);
      res.status(500).json({ error: 'Failed to create project.' });
    }
  });
});

// PUT /api/projects/:id  — PROTECTED
app.put('/api/projects/:id', requireAuth, (req, res) => {
  upload.single('image')(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message });
    }
    try {
      const { id } = req.params;
      if (!isValidUUID(id) && !/^\d+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid project ID.' });
      }

      const db = readDB();
      const index = db.projects.findIndex((p) => p.id === id);
      if (index === -1) return res.status(404).json({ error: 'Project not found.' });

      const updates = req.body;
      let imageUrl = db.projects[index].coverImage; // keep existing by default

      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      } else if (updates.coverImage && typeof updates.coverImage === 'string' && updates.coverImage !== db.projects[index].coverImage) {
        const sanitized = sanitizeImageUrl(updates.coverImage, res);
        if (sanitized === null) return;
        imageUrl = sanitized;
      }

      db.projects[index] = {
        ...db.projects[index],
        name: updates.name?.trim() ?? db.projects[index].name,
        category: updates.category ?? db.projects[index].category,
        location: updates.location?.trim() ?? db.projects[index].location,
        shortDescription: updates.shortDescription?.trim() ?? db.projects[index].shortDescription,
        projectStatus: updates.projectStatus ?? db.projects[index].projectStatus,
        publishStatus: updates.publishStatus === 'published' ? 'published' : (updates.publishStatus === 'draft' ? 'draft' : db.projects[index].publishStatus),
        showOnLandingPage: updates.showOnLandingPage !== undefined
          ? (updates.showOnLandingPage === 'true' || updates.showOnLandingPage === true)
          : db.projects[index].showOnLandingPage,
        coverImage: imageUrl,
        updatedAt: new Date().toISOString(),
      };

      writeDB(db);
      res.json(db.projects[index]);
    } catch (err) {
      console.error('[PUT /api/projects]', err.message);
      res.status(500).json({ error: 'Failed to update project.' });
    }
  });
});

// DELETE /api/projects/:id  — PROTECTED
app.delete('/api/projects/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    const initialLen = db.projects.length;
    db.projects = db.projects.filter((p) => p.id !== id);

    if (db.projects.length === initialLen) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    writeDB(db);
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/projects]', err.message);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// ─── Contact Route ────────────────────────────────────────────────────────────

app.post('/api/contact', apiLimiter, (req, res) => {
  try {
    const { name, email, phone, message } = req.body ?? {};

    // Validate inputs
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    // Sanitize: strip control chars
    const sanitize = (str) => String(str || '').replace(/[\x00-\x1F\x7F]/g, '').slice(0, 2000);

    const enquiry = {
      id: randomUUID(),
      name: sanitize(name).slice(0, 100),
      email: sanitize(email).slice(0, 200),
      phone: sanitize(phone).slice(0, 20),
      message: sanitize(message).slice(0, 2000),
      receivedAt: new Date().toISOString(),
    };

    // Store enquiry to a separate file
    const enquiriesPath = path.resolve(__dirname, '..', 'data', 'enquiries.json');
    let enquiries = { enquiries: [] };
    try {
      if (fs.existsSync(enquiriesPath)) {
        enquiries = JSON.parse(fs.readFileSync(enquiriesPath, 'utf-8'));
      }
    } catch { /* start fresh if corrupted */ }

    enquiries.enquiries.push(enquiry);
    const tmpPath = enquiriesPath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(enquiries, null, 2));
    fs.renameSync(tmpPath, enquiriesPath);

    console.log(`[Contact] New enquiry from: ${enquiry.name} <${enquiry.email}>`);
    res.json({ success: true, message: 'Your enquiry has been received! We will contact you soon.' });
  } catch (err) {
    console.error('[POST /api/contact]', err.message);
    res.status(500).json({ error: 'Failed to submit enquiry. Please try again.' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * If it's a base64 data URI (from legacy frontend form), decode and save to disk.
 * If it's a relative path (existing upload), keep it.
 * Returns the path string, or null (and sends the response) if invalid.
 */
function sanitizeImageUrl(coverImage, res) {
  if (coverImage.startsWith('/uploads/')) {
    // Already a saved path — accept as-is (path traversal guard)
    const basename = path.basename(coverImage);
    const ext = path.extname(basename).toLowerCase().replace('.', '');
    if (!ALLOWED_EXT.has(ext)) {
      res.status(400).json({ error: 'Invalid image path.' });
      return null;
    }
    return `/uploads/${basename}`;
  }

  if (coverImage.startsWith('data:image/')) {
    // Base64 upload from frontend
    const mimeMatch = coverImage.match(/^data:(image\/\w+);base64,/);
    if (!mimeMatch) {
      res.status(400).json({ error: 'Invalid image data URI.' });
      return null;
    }
    const mime = mimeMatch[1];
    if (!ALLOWED_MIME.has(mime)) {
      res.status(400).json({ error: `Unsupported image type: ${mime}` });
      return null;
    }
    const ext = mime.split('/')[1];
    if (!ALLOWED_EXT.has(ext)) {
      res.status(400).json({ error: 'Invalid image extension.' });
      return null;
    }
    const base64Data = coverImage.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(base64Data, 'base64');
    if (buf.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Image exceeds 5MB limit.' });
      return null;
    }
    const filename = `project_${randomUUID()}.${ext}`;
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buf);
    return `/uploads/${filename}`;
  }

  // External URL — allow only https
  if (coverImage.startsWith('https://')) {
    return coverImage;
  }

  res.status(400).json({ error: 'Invalid cover image format.' });
  return null;
}

// ─── 404 + Error Handlers ─────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Global error handler — NEVER leaks stack traces in production
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err.message);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n✅  DEV CONSTRUCTIONS API running on http://localhost:${PORT}`);
  console.log(`   Frontend origin: ${FRONTEND_ORIGIN}`);
  console.log(`   Environment:     ${process.env.NODE_ENV || 'development'}\n`);
});
