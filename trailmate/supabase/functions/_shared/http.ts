/**
 * HTTP plumbing shared by every Edge Function: CORS, JSON responses, and a single error
 * shape the mobile client can rely on.
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Thrown by handlers to produce a specific status without leaking internals. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "request_failed",
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

export function preflight(): Response {
  return new Response("ok", { headers: corsHeaders });
}

type Handler = (req: Request) => Promise<Response>;

/**
 * Wraps a handler with CORS, method checking and uniform error reporting. Unexpected
 * errors are logged in full but returned as a generic 500 — Stripe IDs, SQL text and
 * stack traces never reach the client.
 */
export function serveJson(handler: Handler, opts: { methods?: string[] } = {}): void {
  const methods = opts.methods ?? ["POST"];

  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return preflight();

    if (!methods.includes(req.method)) {
      return json({ error: "method_not_allowed" }, 405);
    }

    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof HttpError) {
        console.warn(`[${error.code}] ${error.message}`);
        return json({ error: error.code, message: error.message }, error.status);
      }
      console.error("unhandled error", error);
      return json({ error: "internal_error" }, 500);
    }
  });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON", "invalid_body");
  }
}

/** Guards cron-invoked functions (§7 release-payouts, send-notifications). */
export function assertCronSecret(req: Request, expected: string): void {
  const provided = req.headers.get("x-cron-secret");
  if (!provided || provided !== expected) {
    throw new HttpError(401, "Invalid cron secret", "unauthorized");
  }
}
