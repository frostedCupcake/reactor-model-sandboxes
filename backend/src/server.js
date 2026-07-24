import { createServer } from "node:http";
import { getReactorError, getReactorModelName, mintReactorToken } from "./reactor.js";
import {
  clearSessionCookie,
  createKeySession,
  parseCookies,
  readKeySession,
  SESSION_COOKIE,
  sessionCookie,
} from "./session.js";

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "127.0.0.1";
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Origin": origin === frontendOrigin ? origin : frontendOrigin,
    "Cache-Control": "no-store, private, max-age=0",
    Vary: "Origin",
  };
}

function sendJson(response, status, body, origin, extraHeaders = {}) {
  response.writeHead(status, {
    ...corsHeaders(origin),
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_768) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function keySession(request) {
  const cookies = parseCookies(request.headers.cookie);
  return readKeySession(cookies[SESSION_COOKIE]);
}

async function validateAndMint(apiKey, modelName) {
  try {
    return await mintReactorToken(apiKey, modelName);
  } catch {
    return null;
  }
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin || "";
  if (origin && origin !== frontendOrigin) {
    return sendJson(response, 403, { error: "This origin is not allowed." }, origin);
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders(origin));
    return response.end();
  }

  try {
    const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, { ok: true }, origin);
    }

    if (request.method === "GET" && url.pathname === "/api/reactor/key") {
      const session = keySession(request);
      return sendJson(response, 200, {
        saved: Boolean(session),
        expiresAt: session?.expiresAt || null,
      }, origin);
    }

    if (request.method === "POST" && url.pathname === "/api/reactor/key") {
      const body = await readJson(request);
      const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
      const modelName = getReactorModelName(body.model, body.mode);
      if (apiKey.length < 8 || apiKey.length > 512) {
        return sendJson(response, 400, { error: "Enter a valid Reactor API key." }, origin);
      }
      if (!modelName) {
        return sendJson(response, 400, { error: "Choose a supported Reactor model." }, origin);
      }
      const result = await validateAndMint(apiKey, modelName);
      if (!result) {
        return sendJson(response, 502, { error: "Reactor authentication is temporarily unavailable." }, origin);
      }
      if (!result.response.ok || !result.data?.jwt) {
        return sendJson(
          response,
          result.response.status >= 400 && result.response.status < 500 ? result.response.status : 502,
          { error: getReactorError(result.data, "Reactor did not accept that API key.") },
          origin,
        );
      }
      const session = createKeySession(apiKey);
      return sendJson(
        response,
        200,
        { saved: true, expiresAt: session.expiresAt, jwt: result.data.jwt },
        origin,
        { "Set-Cookie": sessionCookie(session.value) },
      );
    }

    if (request.method === "DELETE" && url.pathname === "/api/reactor/key") {
      return sendJson(
        response,
        200,
        { saved: false },
        origin,
        { "Set-Cookie": clearSessionCookie() },
      );
    }

    if (request.method === "POST" && url.pathname === "/api/reactor/token") {
      const body = await readJson(request);
      const modelName = getReactorModelName(body.model, body.mode);
      const session = keySession(request);
      if (!modelName) {
        return sendJson(response, 400, { error: "Choose a supported Reactor model." }, origin);
      }
      if (!session) {
        return sendJson(
          response,
          401,
          { error: "Add a Reactor API key to start a session.", requiresApiKey: true },
          origin,
        );
      }
      const result = await validateAndMint(session.apiKey, modelName);
      if (!result) {
        return sendJson(response, 502, { error: "Reactor authentication is temporarily unavailable." }, origin);
      }
      if (!result.response.ok || !result.data?.jwt) {
        const requiresApiKey = [401, 403].includes(result.response.status);
        return sendJson(
          response,
          result.response.status >= 400 && result.response.status < 500 ? result.response.status : 502,
          {
            error: getReactorError(result.data, "Reactor could not start a session."),
            requiresApiKey,
          },
          origin,
          requiresApiKey ? { "Set-Cookie": clearSessionCookie() } : {},
        );
      }
      return sendJson(response, 200, { jwt: result.data.jwt }, origin);
    }

    return sendJson(response, 404, { error: "Not found." }, origin);
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : 500;
    return sendJson(
      response,
      status,
      { error: status === 400 ? "The request body is not valid JSON." : "The backend could not complete the request." },
      origin,
    );
  }
});

server.listen(port, host, () => {
  console.log(`Reactor sandbox backend listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
