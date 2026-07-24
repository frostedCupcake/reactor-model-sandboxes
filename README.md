# Reactor model sandboxes

Each model is a fully independent project with its own `frontend/` and `backend/`.

- [X2](./x2)
- [Happy Oyster](./happy-oyster)
- [LingBot World 2](./lingbot-world-2)
- [SANA-Streaming](./sana-streaming)
- [LingBot](./lingbot)
- [LongLive 2](./longlive-v2)
- [Helios](./helios)

Every backend keeps the long-lived Reactor API key out of frontend JavaScript, encrypts it in a 30-minute HTTP-only session, and mints only model-scoped browser JWTs.
