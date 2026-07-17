// Shared GosentePay API client (v1 — https://api.gosentepay.com)
// Handles Bearer token exchange + caching (24h), and exposes
// deposit / withdraw / status helpers.

const BASE_URL = "https://api.gosentepay.com/v1";

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}
let cachedToken: CachedToken | null = null;

function apiKey(): string {
  const k = Deno.env.get("GOSENTEPAY_API_KEY");
  if (!k) throw new Error("GOSENTEPAY_API_KEY not configured");
  return k;
}

function secretKey(): string {
  const k = Deno.env.get("GOSENTEPAY_SECRET_KEY");
  if (!k) throw new Error("GOSENTEPAY_SECRET_KEY not configured");
  return k;
}

export function normalizePhone(input: string): string {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.startsWith("256")) return digits;
  if (digits.startsWith("0")) return "256" + digits.slice(1);
  return "256" + digits;
}

export async function getAuthToken(force = false): Promise<string> {
  const now = Date.now();
  if (!force && cachedToken && cachedToken.expiresAt - now > 60_000) {
    return cachedToken.token;
  }

  const resp = await fetch(`${BASE_URL}/authorization_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey() }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.status !== "success" || !data?.token) {
    throw new Error(`GosentePay token exchange failed: ${resp.status} ${JSON.stringify(data)}`);
  }
  const expiresIn = Number(data.expires_in ?? 86400) * 1000;
  cachedToken = { token: data.token, expiresAt: now + expiresIn };
  return cachedToken.token;
}

async function authedPost(path: string, body: Record<string, unknown>): Promise<{ status: number; body: any }> {
  let token = await getAuthToken();
  let resp = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  // If the cached token expired, force refresh once and retry
  if (resp.status === 401) {
    token = await getAuthToken(true);
    resp = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  }
  const text = await resp.text();
  let parsed: any;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: resp.status, body: parsed };
}

export interface GosenteDepositInput {
  phone: string;
  amount: number;
  email: string;
  ref: string;
  callback: string;
  currency?: string;
}

export async function gosenteDeposit(input: GosenteDepositInput) {
  return authedPost("/deposit", {
    secret_key: secretKey(),
    phone: normalizePhone(input.phone),
    amount: input.amount,
    email: input.email,
    ref: input.ref,
    callback: input.callback,
    currency: input.currency ?? "UGX",
  });
}

export interface GosenteWithdrawInput {
  phone: string;
  amount: number;
  email: string;
  reason: string;
  ref: string;
}

export async function gosenteWithdraw(input: GosenteWithdrawInput) {
  return authedPost("/withdraw", {
    secret_key: secretKey(),
    phone: normalizePhone(input.phone),
    amount: input.amount,
    email: input.email,
    reason: input.reason,
    ref: input.ref,
  });
}

export async function gosenteStatus(ref: string) {
  return authedPost("/transaction-status", { ref });
}

/** Interpret GosentePay response — success codes 200/202 with "accepted"/"success"/"sent" message. */
export function isGosenteSuccess(status: number, body: any): boolean {
  if (status < 200 || status >= 300) return false;
  const inner = body?.data ?? body;
  const code = inner?.status ?? inner?.code ?? body?.status;
  const msg = String(inner?.message ?? body?.message ?? "").toLowerCase();
  const okCode = code === 200 || code === 202 || code === "200" || code === "202" || body?.status === "success";
  const okMsg = msg.includes("accept") || msg.includes("success") || msg.includes("sent") || msg.includes("please check");
  return Boolean(okCode || okMsg);
}