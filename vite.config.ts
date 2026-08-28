import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { randomUUID, randomBytes } from 'crypto'

/**
 * DEV CONSTRUCTIONS — Hardened Vite Dev Mock API
 * ===============================================
 * This plugin runs ONLY during `npm run dev` (local development).
 * For production, use the Express.js backend in /server.
 *
 * Security improvements over original:
 *  ✅ Random per-process session token (not a hardcoded string)
 *  ✅ Auth check on all write/delete endpoints
 *  ✅ JSON.parse wrapped in try/catch (no crash on bad input)
 *  ✅ File extension & size validated server-side
 *  ✅ Manual in-memory rate limiting on login
 *  ✅ crypto.randomUUID() for project IDs
 *  ✅ No hardcoded fallback credentials — startup fails loudly
 */

const mockApiPlugin = (env: Record<string, string>) => {
  const adminUsername = env.ADMIN_USERNAME;
  const adminPassword = env.ADMIN_PASSWORD;

  // Fail loudly if credentials are not configured
  if (!adminUsername || !adminPassword) {
    console.error('\n\x1b[31m%s\x1b[0m', '❌  FATAL: ADMIN_USERNAME and ADMIN_PASSWORD must be set in your .env file!');
    console.error('\x1b[33m%s\x1b[0m', '   Copy .env.example to .env and fill in your credentials.\n');
    process.exit(1);
  }

  // Per-process session token (lost when dev server restarts — fine for dev)
  let sessionToken: string | null = null;

  // Simple in-memory rate limiter for login attempts
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS    = 15 * 60 * 1000; // 15 minutes

  const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
  const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

  return {
    name: 'mock-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {

        // ── Helper: safe JSON body parser ─────────────────────────────────────
        const getBody = (): Promise<Record<string, any> | null> =>
          new Promise((resolve) => {
            let raw = '';
            req.on('data', (chunk: any) => (raw += chunk.toString()));
            req.on('end', () => {
              if (!raw) return resolve({});
              try { resolve(JSON.parse(raw)); }
              catch {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
                resolve(null);
              }
            });
          });

        // ── Helper: require auth ──────────────────────────────────────────────
        const checkAuth = (): boolean => {
          const auth = req.headers['authorization'];
          if (!auth || !sessionToken || auth !== `Bearer ${sessionToken}`) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Authentication required.' }));
            return false;
          }
          return true;
        };

        // ── Helper: JSON helper ───────────────────────────────────────────────
        const json = (data: any, status = 200) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };

        // ── Helper: get client IP ─────────────────────────────────────────────
        const clientIp = req.socket.remoteAddress || 'unknown';

        // ─────────────────────────────────────────────────────────────────────
        // AUTH — POST /api/admin/login
        // ─────────────────────────────────────────────────────────────────────
        if (req.url === '/api/admin/login' && req.method === 'POST') {
          // Rate limiting
          const now = Date.now();
          const attempt = loginAttempts.get(clientIp) || { count: 0, resetAt: now + WINDOW_MS };
          if (now > attempt.resetAt) { attempt.count = 0; attempt.resetAt = now + WINDOW_MS; }
          if (attempt.count >= MAX_ATTEMPTS) {
            return json({ error: 'Too many login attempts. Please try again in 15 minutes.' }, 429);
          }

          const body = await getBody();
          if (body === null) return;

          if (body.username === adminUsername && body.password === adminPassword) {
            attempt.count = 0; // reset on success
            loginAttempts.set(clientIp, attempt);
            sessionToken = randomBytes(32).toString('hex');
            return json({ success: true, token: sessionToken });
          } else {
            attempt.count++;
            loginAttempts.set(clientIp, attempt);
            return json({ error: 'Invalid username or password.' }, 401);
          }
        }

        // ─────────────────────────────────────────────────────────────────────
        // AUTH — GET /api/admin/session
        // ─────────────────────────────────────────────────────────────────────
        if (req.url === '/api/admin/session' && req.method === 'GET') {
          const auth = req.headers['authorization'];
          const valid = !!(auth && sessionToken && auth === `Bearer ${sessionToken}`);
          return json({ valid });
        }

        // ─────────────────────────────────────────────────────────────────────
        // AUTH — POST /api/admin/logout
        // ─────────────────────────────────────────────────────────────────────
        if (req.url === '/api/admin/logout' && req.method === 'POST') {
          sessionToken = null;
          return json({ success: true });
        }

        // ─────────────────────────────────────────────────────────────────────
        // PROJECTS — /api/projects*
        // ─────────────────────────────────────────────────────────────────────
        if (req.url?.startsWith('/api/projects')) {
          const dbPath = path.resolve(__dirname, 'data/db.json');

          // ── DB helpers ──────────────────────────────────────────────────────
          const readDB = (): { projects: any[] } => {
            try {
              if (!fs.existsSync(dbPath)) {
                fs.mkdirSync(path.dirname(dbPath), { recursive: true });
                fs.writeFileSync(dbPath, JSON.stringify({ projects: [] }));
              }
              return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
            } catch { return { projects: [] }; }
          };

          const writeDB = (data: any) => {
            const tmp = dbPath + '.tmp';
            fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
            fs.renameSync(tmp, dbPath);
          };

          // ── Validate & save base64 image ────────────────────────────────────
          const saveBase64Image = (dataUri: string): string | null => {
            if (!dataUri.startsWith('data:image/')) return null;
            const mimeMatch = dataUri.match(/^data:(image\/\w+);base64,/);
            if (!mimeMatch) return null;
            const ext = mimeMatch[1].split('/')[1].toLowerCase();
            if (!ALLOWED_EXTS.has(ext)) return null;
            const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, '');
            const buf = Buffer.from(base64Data, 'base64');
            if (buf.length > MAX_FILE_BYTES) return null;
            const uploadsDir = path.resolve(__dirname, 'public/uploads');
            fs.mkdirSync(uploadsDir, { recursive: true });
            const filename = `project_${randomUUID()}.${ext}`;
            fs.writeFileSync(path.join(uploadsDir, filename), buf);
            return `/uploads/${filename}`;
          };

          // GET /api/projects — public
          if (req.method === 'GET') {
            const db = readDB();
            return json(db.projects);
          }

          // POST /api/projects — protected
          if (req.method === 'POST') {
            if (!checkAuth()) return;
            const body = await getBody();
            if (body === null) return;

            let imageUrl = '';
            if (body.coverImage?.startsWith('data:image/')) {
              const saved = saveBase64Image(body.coverImage);
              if (!saved) return json({ error: 'Invalid or oversized image.' }, 400);
              imageUrl = saved;
            } else if (body.coverImage?.startsWith('https://')) {
              imageUrl = body.coverImage;
            }

            const now = new Date().toISOString();
            const project = {
              id: randomUUID(),
              name: String(body.name || '').trim(),
              category: body.category || 'Other',
              location: String(body.location || '').trim(),
              shortDescription: String(body.shortDescription || '').trim(),
              projectStatus: body.projectStatus || 'Completed',
              coverImage: imageUrl,
              publishStatus: body.publishStatus === 'published' ? 'published' : 'draft',
              showOnLandingPage: body.showOnLandingPage === true || body.showOnLandingPage === 'true',
              createdAt: now,
              updatedAt: now,
            };

            const db = readDB();
            db.projects.push(project);
            writeDB(db);
            return json(project, 201);
          }

          // PUT /api/projects/:id — protected
          if (req.method === 'PUT') {
            if (!checkAuth()) return;
            const body = await getBody();
            if (body === null) return;

            const id = req.url.split('/').pop();
            const db = readDB();
            const index = db.projects.findIndex((p: any) => p.id === id);
            if (index === -1) return json({ error: 'Project not found.' }, 404);

            let imageUrl = db.projects[index].coverImage;
            if (body.coverImage && body.coverImage !== imageUrl) {
              if (body.coverImage.startsWith('data:image/')) {
                const saved = saveBase64Image(body.coverImage);
                if (!saved) return json({ error: 'Invalid or oversized image.' }, 400);
                imageUrl = saved;
              } else if (body.coverImage.startsWith('/uploads/')) {
                imageUrl = `/uploads/${path.basename(body.coverImage)}`;
              } else if (body.coverImage.startsWith('https://')) {
                imageUrl = body.coverImage;
              }
            }

            db.projects[index] = { ...db.projects[index], ...body, coverImage: imageUrl, updatedAt: new Date().toISOString() };
            writeDB(db);
            return json(db.projects[index]);
          }

          // DELETE /api/projects/:id — protected
          if (req.method === 'DELETE') {
            if (!checkAuth()) return;
            const id = req.url.split('/').pop();
            const db = readDB();
            const prev = db.projects.length;
            db.projects = db.projects.filter((p: any) => p.id !== id);
            if (db.projects.length === prev) return json({ error: 'Project not found.' }, 404);
            writeDB(db);
            return json({ success: true });
          }
        }

        // ─────────────────────────────────────────────────────────────────────
        // CONTACT — POST /api/contact (dev: just log it)
        // ─────────────────────────────────────────────────────────────────────
        if (req.url === '/api/contact' && req.method === 'POST') {
          const body = await getBody();
          if (body === null) return;
          const { name, email, phone, message } = body;
          if (!name?.trim() || !email?.trim() || !message?.trim()) {
            return json({ error: 'Name, email, and message are required.' }, 400);
          }
          console.log('\n[Contact Enquiry]', { name, email, phone, message });
          return json({ success: true, message: 'Your enquiry has been received! We will contact you soon.' });
        }

        next();
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), mockApiPlugin(env)],
  };
});
