// No SDK dependency, user account, personal profile, or analytics integration.
const allowedOrigins = new Set([
  "https://abhikhur.com",
  "https://www.abhikhur.com",
  "https://abhikhur27.github.io",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
]);
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();

function json(status: number, body: unknown, origin: string | null, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Vary": "Origin",
      ...(origin && allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
      ...extra,
    },
  });
}

function sameKey(a: string, b: string): boolean {
  if (a.length !== b.length || a.length > 200) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function limitedBody(req: Request): Promise<string> {
  if (Number(req.headers.get("content-length") || 0) > 256) throw new Error("body_limit");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("bad_body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 256) { await reader.cancel(); throw new Error("body_limit"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(403, { error: "origin_not_allowed" }, null);
  if (req.method === "OPTIONS") {
    if (!origin) return json(403, { error: "origin_required" }, null);
    return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "apikey, content-type",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
    }});
  }
  if (!["GET", "POST"].includes(req.method)) return json(405, { error: "method_not_allowed" }, origin, { Allow: "GET, POST, OPTIONS" });

  try {
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const apiKey = req.headers.get("apikey") || "";
    const authorized = Object.values(publishableKeys).some(key =>
      typeof key === "string" && key.startsWith("sb_publishable_") && sameKey(apiKey, key));
    if (!authorized) return json(401, { error: "invalid_api_key" }, origin);

    const secretKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default;
    const projectUrl = Deno.env.get("SUPABASE_URL");
    if (typeof secretKey !== "string" || !secretKey.startsWith("sb_secret_") || !projectUrl) {
      return json(503, { error: "temporarily_unavailable" }, origin);
    }

    let rpc = "portfolio_mark_count";
    let payload: Record<string, string> = {};
    if (req.method === "POST") {
      if (!origin) return json(403, { error: "origin_required" }, null);
      if (new URL(req.url).search) return json(400, { error: "invalid_request" }, origin);
      if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
        return json(415, { error: "json_required" }, origin);
      }
      let body;
      try { body = JSON.parse(await limitedBody(req)); }
      catch (error) { return json(error instanceof Error && error.message === "body_limit" ? 413 : 400, { error: "invalid_request" }, origin); }
      if (!body || Array.isArray(body) || typeof body !== "object" || Object.keys(body).length !== 1 ||
          typeof body.visitorId !== "string" || !uuidV4.test(body.visitorId)) {
        return json(400, { error: "invalid_request" }, origin);
      }

      // Only transiently inspect proxy-supplied IP information. Never log/store it.
      // Public Origin/key headers are not bot-proof; quotas also bound all writes.
      const network = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 128);
      const day = new Date().toISOString().slice(0, 10);
      const hmacKey = await crypto.subtle.importKey("raw", encoder.encode(secretKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const networkHash = hex(await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(`portfolio-network-v1:${day}:${network}`)));
      const visitorHash = hex(await crypto.subtle.digest("SHA-256", encoder.encode(`portfolio-mark-v1:${body.visitorId.toLowerCase()}`)));
      rpc = "portfolio_record_mark";
      payload = { p_visitor_hash: visitorHash, p_network_hash: networkHash };
    }

    const result = await fetch(`${projectUrl}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: { apikey: secretKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!result.ok) return json(503, { error: "temporarily_unavailable" }, origin);
    const data = await result.json();
    if (data.error) {
      return json(data.error === "rate_limit" ? 429 : 503, { error: data.error }, origin, { "Retry-After": String(data.retryAfter || 3600) });
    }
    if (!Number.isSafeInteger(data.count) || data.count < 0) return json(503, { error: "temporarily_unavailable" }, origin);
    return json(200, data, origin);
  } catch {
    // Deliberately do not log request bodies, headers, server keys, or raw errors.
    return json(503, { error: "temporarily_unavailable" }, origin);
  }
}

Deno.serve(handler);
