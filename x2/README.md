# X2 sandbox

A complete, standalone X2 sandbox with separate frontend and backend services.

- `frontend/`: Full React UI, media inputs, session controls, and X2 adapter.
- `backend/`: API-key validation, encrypted 30-minute sessions, and model-scoped JWT minting.

## Run

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
npm run dev
```

Open http://localhost:3000 and enter your Reactor API key in the dialog.

## Verify

```bash
npm run check
```
