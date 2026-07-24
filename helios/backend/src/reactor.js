export function getReactorModelName(slug) {
  return slug === "helios" ? "reactor/helios" : "";
}

export function getReactorError(data, fallback) {
  if (typeof data?.message === "string" && data.message) return data.message;
  if (typeof data?.error === "string" && data.error) return data.error;
  if (typeof data?.error?.message === "string" && data.error.message) return data.error.message;
  if (typeof data?.detail === "string" && data.detail) return data.detail;
  return fallback;
}

export async function mintReactorToken(apiKey, modelName) {
  const baseUrl = process.env.REACTOR_API_BASE_URL || "https://api.reactor.inc";
  const response = await fetch(`${baseUrl}/tokens`, {
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
  return { response, data };
}
