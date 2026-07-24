# Reactor model sandboxes

Model-specific source used by the launchd Reactor sandboxes. Each model has its own folder and exports a `startSandbox` function with the same lifecycle:

1. Mint a short-lived, model-scoped JWT on your backend.
2. Connect the typed Reactor model SDK.
3. Attach the model’s main video track.
4. Upload and confirm any reference media.
5. Apply the prompt and start generation.
6. Disconnect when finished so billing stops.

## Models

| Model | Source | Live sandbox | Reactor docs |
| --- | --- | --- | --- |
| X2 | [`x2/sandbox.js`](./x2/sandbox.js) | [Open sandbox](https://thelaunchd.com/reactor/models/x2) | [Docs](https://docs.reactor.inc/model-api-reference/x2/overview) |
| Happy Oyster | [`happy-oyster/sandbox.js`](./happy-oyster/sandbox.js) | [Open sandbox](https://thelaunchd.com/reactor/models/happy-oyster) | [Docs](https://docs.reactor.inc/model-api-reference/happy-oyster/overview) |
| LingBot World 2 | [`lingbot-world-2/sandbox.js`](./lingbot-world-2/sandbox.js) | [Open sandbox](https://thelaunchd.com/reactor/models/lingbot-world-2) | [Docs](https://docs.reactor.inc/model-api-reference/lingbot-world-2/overview) |
| SANA-Streaming | [`sana-streaming/sandbox.js`](./sana-streaming/sandbox.js) | [Open sandbox](https://thelaunchd.com/reactor/models/sana-streaming) | [Docs](https://docs.reactor.inc/model-api-reference/sana-streaming/overview) |
| LingBot | [`lingbot/sandbox.js`](./lingbot/sandbox.js) | [Open sandbox](https://thelaunchd.com/reactor/models/lingbot) | [Docs](https://docs.reactor.inc/model-api-reference/lingbot/overview) |
| LongLive 2 | [`longlive-v2/sandbox.js`](./longlive-v2/sandbox.js) | [Open sandbox](https://thelaunchd.com/reactor/models/longlive-v2) | [Docs](https://docs.reactor.inc/model-api-reference/longlive-v2/overview) |
| Helios | [`helios/sandbox.js`](./helios/sandbox.js) | [Open sandbox](https://thelaunchd.com/reactor/models/helios) | [Docs](https://docs.reactor.inc/model-api-reference/helios/overview) |

## Install

```bash
npm install
```

Import the adapter you want and pass it a short-lived JWT plus the inputs listed in that adapter. Never put a long-lived Reactor API key in browser source. Use [`token-server.js`](./token-server.js) from a trusted backend to mint a scoped JWT.

## Verify

```bash
npm run check
```

The shared helpers deliberately wait for Reactor’s image-accepted message before starting generation. This prevents the reference-image race that otherwise causes sessions to hang during startup.
