# DEV CONSTRUCTIONS — Backend Server

A hardened Express.js API powering the DEV CONSTRUCTIONS admin panel.

## Security Features
- 🔐 bcrypt password hashing (cost factor 12)
- 🍪 HttpOnly + Secure + SameSite=Strict session cookies
- 🛡️ Helmet (CSP, HSTS, X-Frame-Options, and 12 more headers)
- 🚫 Rate limiting: 5 login attempts / 15 min per IP
- ✅ Strict file upload validation (MIME + extension + size)
- 🔑 Cryptographically random session tokens (in-memory Map)
- 🔒 CORS locked to frontend origin only
- 💾 Atomic JSON DB writes (temp file + rename)
- 🚨 No stack traces exposed in error responses

---

## Quick Start (Development)

```bash
cd server
npm install
node setup-credentials.js   # run once to set up admin credentials
npm run dev                  # starts on port 4000
```

## Production Deployment

### Railway (Recommended — free tier available)

1. Create a new Railway project
2. Connect your GitHub repo
3. Set root directory to `server/`
4. Add environment variables in Railway dashboard (copy from `.env.example`)
5. Railway auto-detects Node.js and runs `npm start`

### Render

1. Create a new Web Service
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add env vars from `.env.example`

### Fly.io

```bash
cd server
fly launch
fly secrets set NODE_ENV=production PORT=4000 ADMIN_USERNAME=... ADMIN_PASSWORD_HASH=... COOKIE_SECRET=... FRONTEND_ORIGIN=https://your-frontend.com
fly deploy
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Port to listen on | No (default: 4000) |
| `NODE_ENV` | `production` or `development` | Yes |
| `ADMIN_USERNAME` | Admin login username | Yes |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of admin password | Yes |
| `COOKIE_SECRET` | 64-byte random hex secret for signing cookies | Yes |
| `FRONTEND_ORIGIN` | Frontend URL (for CORS) | Yes |

Generate credentials with:
```bash
node setup-credentials.js
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/login` | — | Login (rate limited) |
| GET | `/api/admin/session` | Cookie | Check session validity |
| POST | `/api/admin/logout` | Cookie | Logout |
| GET | `/api/projects` | — | List projects (public) |
| POST | `/api/projects` | Cookie | Create project |
| PUT | `/api/projects/:id` | Cookie | Update project |
| DELETE | `/api/projects/:id` | Cookie | Delete project |
| POST | `/api/contact` | — | Submit enquiry |

---

## After Deploying

Update your frontend `.env` file:
```
VITE_API_URL=https://your-backend-url.railway.app
```

Then rebuild and redeploy your frontend.
