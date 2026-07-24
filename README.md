# Reactor model sandboxes

Seven independent projects that reproduce the launchd Reactor sandboxes. Every model folder contains its own browser frontend and trusted token backend—no shared application folder is required.

## Choose a model

- [X2](./x2)
- [Happy Oyster](./happy-oyster)
- [LingBot World 2](./lingbot-world-2)
- [SANA-Streaming](./sana-streaming)
- [LingBot](./lingbot)
- [LongLive 2](./longlive-v2)
- [Helios](./helios)

## Repository layout

```text
<model>/
├── frontend/                 Vite + React sandbox
│   ├── src/components/       Complete shared sandbox UI
│   ├── src/model-adapter.js  Model-specific SDK commands
│   ├── src/model-loader.js   Only this model’s SDK import
│   └── public/models/        Built-in reference images
├── backend/                  Trusted Node.js token service
│   ├── src/server.js         HTTP API and CORS
│   ├── src/session.js        Encrypted 30-minute key session
│   └── src/reactor.js        Exact model-scoped token request
├── package.json              Runs both workspaces
└── README.md                 Model-specific end-to-end guide
```

## What happens when Start is clicked?

1. The frontend checks `GET /api/reactor/key` on the local backend.
2. If no valid 30-minute session exists, the frontend asks for the Reactor API key.
3. The key is sent only to the backend with `credentials: include`.
4. The backend requests a JWT scoped to that exact Reactor model.
5. The backend encrypts the API key into an HTTP-only, 30-minute session cookie.
6. The frontend receives only the short-lived JWT and connects the typed Reactor SDK.
7. The frontend prepares video/reference media, waits for Reactor’s acceptance event, sets the prompt, and starts generation.
8. Disconnect releases the Reactor session and media tracks.

The long-lived Reactor API key is never placed in frontend source, local storage, or a browser-readable cookie.

## Fastest path

Open one model folder and follow its README. Each guide includes environment setup, combined and separate service commands, a health check, the exact UI workflow, and deployment settings.
