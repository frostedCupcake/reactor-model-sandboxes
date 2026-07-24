# Reactor model sandboxes

The complete, standalone source for the launchd Reactor sandboxes, separated into a browser frontend and a trusted token backend.

## Architecture

```text
reactor-model-sandboxes/
├── frontend/
│   ├── src/                         Vite + React application
│   ├── src/components/              Complete sandbox UI and lifecycle
│   ├── src/models/                  One model-specific folder per model
│   ├── src/lib/                     Model catalog and media helpers
│   └── public/models/               Built-in reference images
└── backend/
    ├── src/server.js                CORS and HTTP API
    ├── src/session.js               Encrypted 30-minute key sessions
    └── src/reactor.js               Model-scoped Reactor token minting
```

The frontend never sends a long-lived Reactor API key directly to Reactor. It sends the key once to the backend, which validates it, encrypts it inside an HTTP-only 30-minute session, and returns only short-lived, model-scoped JWTs to the browser.

## Included models

- [X2](./frontend/src/models/x2/sandbox.js)
- [Happy Oyster](./frontend/src/models/happy-oyster/sandbox.js)
- [LingBot World 2](./frontend/src/models/lingbot-world-2/sandbox.js)
- [SANA-Streaming](./frontend/src/models/sana-streaming/sandbox.js)
- [LingBot](./frontend/src/models/lingbot/sandbox.js)
- [LongLive 2](./frontend/src/models/longlive-v2/sandbox.js)
- [Helios](./frontend/src/models/helios/sandbox.js)

The files above contain only the model-specific adapter logic. The complete shared frontend—including the API-key dialog, source uploads, clear-video behavior, connection stages, pause/resume/disconnect controls, references, keyboard controls, and responsive layout—is in [`ReactorModelSandbox.jsx`](./frontend/src/components/reactor-sandbox/ReactorModelSandbox.jsx).

## Run locally

Requirements: Node.js 20 or newer and a Reactor API key.

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter your Reactor API key in the sandbox dialog; do not add it to either environment file.

## Verify

```bash
npm run check
```

This runs backend syntax checks and tests, then creates a production frontend build.

## Production configuration

Frontend:

```env
VITE_REACTOR_BACKEND_URL=https://your-backend.example.com
```

Backend:

```env
FRONTEND_ORIGIN=https://your-frontend.example.com
SESSION_SECRET=replace-with-a-long-random-secret
COOKIE_SECURE=true
COOKIE_SAME_SITE=Lax
```

If the frontend and backend are on different sites rather than subdomains of one site, use `COOKIE_SAME_SITE=None` together with `COOKIE_SECURE=true`.
