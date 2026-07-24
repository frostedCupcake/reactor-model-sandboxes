const MODEL_NAMES = {
  x2: "xmax/x2",
  "happy-oyster-adventure": "reactor/happy-oyster-adventure",
  "happy-oyster-directing": "reactor/happy-oyster-director",
  "lingbot-world-2": "reactor/lingbot-world-2",
  "sana-streaming": "reactor/sana-streaming",
  lingbot: "reactor/lingbot",
  "longlive-v2": "reactor/longlive-v2",
  helios: "reactor/helios",
};

export async function mintScopedReactorToken(apiKey, modelSlug) {
  const modelName = MODEL_NAMES[modelSlug];
  if (!modelName) throw new Error("Unsupported Reactor model.");

  const response = await fetch("https://api.reactor.inc/tokens", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Reactor-API-Key": apiKey,
    },
    body: JSON.stringify({
      expires_after: 1_800,
      authorization_details: [
        {
          type: "session",
          resources: { models: { match: [modelName] } },
          constraints: { max_sessions: 5 },
        },
      ],
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.jwt) {
    throw new Error(data?.message || data?.error?.message || data?.error || "Reactor rejected the token request.");
  }
  return data.jwt;
}
