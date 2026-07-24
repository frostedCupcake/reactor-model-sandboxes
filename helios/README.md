# Helios sandbox

A complete, independently runnable recreation of the launchd Helios sandbox, with separate frontend and backend services.

- Live reference: [thelaunchd.com/reactor/models/helios](https://thelaunchd.com/reactor/models/helios)
- Reactor documentation: [Helios model reference](https://docs.reactor.inc/model-api-reference/helios/overview)

## Prerequisites

- Node.js 20 or newer
- npm
- A valid, funded Reactor API key
- A modern browser with WebRTC support
- Camera permission for webcam-based inputs

Create or manage keys from the [Reactor API Keys page](https://www.reactor.inc/account/api-keys). Do not paste the key into source code or an environment file; the running UI asks for it securely.

## 1. Install

From the public repository:

```bash
git clone https://github.com/frostedCupcake/reactor-model-sandboxes.git
cd reactor-model-sandboxes/helios
npm install
```

## 2. Configure the backend and frontend

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
openssl rand -hex 32
```

Copy the random value printed by OpenSSL into `SESSION_SECRET` in `backend/.env`.

Backend development configuration:

```env
HOST=127.0.0.1
PORT=8787
FRONTEND_ORIGIN=http://localhost:3000
SESSION_SECRET=<paste-the-random-value-here>
COOKIE_SECURE=false
COOKIE_SAME_SITE=Lax
```

Frontend development configuration:

```env
VITE_REACTOR_BACKEND_URL=http://localhost:8787
```

## 3. Start both services

One command starts the backend and frontend together:

```bash
npm run dev
```

Expected services:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend: [http://localhost:8787](http://localhost:8787)
- Backend health: [http://localhost:8787/health](http://localhost:8787/health)

Confirm the backend before opening the sandbox:

```bash
curl http://localhost:8787/health
```

Expected response:

```json
{"ok":true}
```

### Run in separate terminals

This is useful when debugging backend and frontend logs independently.

Terminal 1:

```bash
npm run dev --workspace backend
```

Terminal 2:

```bash
npm run dev --workspace frontend
```

## 4. Reproduce the launchd sandbox flow

1. Open [http://localhost:3000](http://localhost:3000).
2. Enter a generation prompt and optionally select or upload a reference image.
3. Click **Start session**.
4. Enter the Reactor API key when the dialog appears.
5. Click **Save and start**. The key is encrypted for 30 minutes; the browser receives only a scoped JWT.
6. Follow the connection stages until the status changes to **Live**.
7. Apply another prompt, update the reference, adjust image strength through the adapter, or pause and resume.
8. Click **Disconnect** when finished. This releases the session and stops billing.

## Backend API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service readiness |
| `GET` | `/api/reactor/key` | Check whether the encrypted key session is valid |
| `POST` | `/api/reactor/key` | Validate a key, create the 30-minute session, and return the first scoped JWT |
| `DELETE` | `/api/reactor/key` | Clear the encrypted key session |
| `POST` | `/api/reactor/token` | Mint another short-lived JWT from the saved key session |

The backend accepts requests only from `FRONTEND_ORIGIN` and enables credentialed CORS so the HTTP-only cookie can accompany frontend requests.

## Verify the source

```bash
npm run check
```

This command runs backend syntax checks, encrypted-session tests, and a production frontend build.

## Production deployment

Deploy `frontend/` and `backend/` as separate services.

Frontend:

```env
VITE_REACTOR_BACKEND_URL=https://reactor-api.example.com
```

Backend:

```env
HOST=0.0.0.0
PORT=8787
FRONTEND_ORIGIN=https://sandbox.example.com
SESSION_SECRET=<a-stable-random-secret-at-least-32-characters>
COOKIE_SECURE=true
COOKIE_SAME_SITE=Lax
```

Use `COOKIE_SAME_SITE=None` with `COOKIE_SECURE=true` when the frontend and backend are hosted on different sites. Keep `SESSION_SECRET` stable across backend restarts or saved 30-minute sessions cannot be decrypted.

Configure the frontend host to serve `index.html` as the fallback for browser routes.

## Troubleshooting

- **Failed to fetch:** Confirm the backend is running on port 8787, `VITE_REACTOR_BACKEND_URL` is correct, and `FRONTEND_ORIGIN` exactly matches the browser origin.
- **API key is requested repeatedly:** Allow cookies, keep `credentials: include` in frontend requests, and keep `SESSION_SECRET` unchanged.
- **Invalid API key:** Create or copy a current key from Reactor and remove leading/trailing spaces.
- **Credits depleted / HTTP 402:** Add Reactor credits; the application cannot bypass account billing.
- **Camera does not open:** Grant browser permission and use localhost or HTTPS.
- **Connecting never becomes Live:** Verify the key can access Helios, required media is selected, and the backend minted a token for the exact model scope.
- **Reference upload times out:** Use a supported image and preserve the code that waits for Reactor’s image-accepted message before starting.
- **Port already in use:** Stop the conflicting process or change the matching backend/frontend port and environment URL together.

## Security notes

- Never expose `SESSION_SECRET` or the Reactor API key through a `VITE_` variable.
- Only the backend sends `Reactor-API-Key` to Reactor.
- The frontend receives short-lived, model-scoped JWTs.
- Disconnect sessions when finished because active Reactor sessions consume credits.
