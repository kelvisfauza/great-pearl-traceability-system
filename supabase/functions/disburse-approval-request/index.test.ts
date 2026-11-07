import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

// Execute the real handler with isolated storage/provider doubles. No money is sent.
const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "");
const compiled = new Bun.Transpiler({ loader: "ts" }).transformSync(source);

async function release(options: { existing?: boolean; reserveOk?: boolean; deleteError?: boolean; cash?: boolean; lookupError?: boolean } = {}) {
  let handler: (req: Request) => Promise<Response> = async () => new Response();
  let debit = options.existing ? -72000 : 0;
  let inserted = 0;
  let providerCalls = 0;
  let reversals = 0;
  const updates: any[] = [];
  const svc = {
    rpc: async () => ({ data: 1700, error: null }),
    auth: { getUser: async () => ({ data: { user: { email: "finance@example.test" } } }) },
    functions: { invoke: async () => ({}) },
    from(table: string) {
      let operation = "select";
      const filters: Record<string, string> = {};
      const result = () => {
        if (table === "ledger_entries") {
          if (operation === "insert") { debit = -72000; inserted++; return { error: null }; }
          if (operation === "delete") {
            assert.equal(filters.reference, "WD-APPROVAL-request-1");
            assert.equal(filters.user_id, "employee-1");
            if (options.deleteError) return { error: { message: "delete refused" } };
            debit = 0;
            return { data: [{ id: "ledger-1" }], error: null };
          }
          return { data: debit ? { id: "ledger-1" } : null, error: options.lookupError ? { message: "lookup refused" } : null };
        }
        if (table === "partial_payments") return { data: null };
        if (operation === "update") return { data: [{ id: "request-1" }] };
        return { data: { id: "request-1", status: "approved", amount: 72000, type: "Withdrawal request", title: "Wallet withdrawal", details: { request_type: "withdrawal", user_id: "employee-1" } } };
      };
      const query: any = {
        select: () => query,
        eq: (key: string, value: string) => { filters[key] = value; return query; },
        or: () => query,
        insert: () => { operation = "insert"; return query; },
        delete: () => { operation = "delete"; return query; },
        update: (value: any) => { operation = "update"; updates.push(value); return query; },
        maybeSingle: async () => result(),
        then: (resolve: any, reject: any) => Promise.resolve(result()).then(resolve, reject),
      };
      return query;
    },
  };
  new Function("serve", "createClient", "Deno", "treasuryReserve", "treasuryRelease", "yoPayout", "yoNormalize", "gosenteWithdraw", "isGosenteSuccess", "gsNormalize", compiled)(
    (fn: typeof handler) => { handler = fn; }, () => svc, { env: { get: () => "test" } },
    async () => ({ ok: options.reserveOk ?? false, error: "Operations account is empty" }),
    async () => { reversals++; }, async () => { providerCalls++; return { success: false, errorMessage: "Provider refused" }; },
    (phone: string) => phone, async () => { providerCalls++; return {}; }, () => false, (phone: string) => phone,
  );
  const response = await handler(new Request("http://localhost/payment", {
    method: "POST", headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
    body: JSON.stringify({ request_id: "request-1", provider: options.cash ? "cash" : "yo", phone: "256700000000" }),
  }));
  return { body: await response.json(), debit, inserted, providerCalls, reversals, updates };
}

describe("Finance withdrawal failure restoration", () => {
  it("does not draw the Operations account for a wallet withdrawal (no double count)", async () => {
    const result = await release({ cash: true, reserveOk: false });
    assert.equal(result.debit, -72000);
    assert.equal(result.reversals, 0);
  });
  it("restores a debit inherited from an earlier failed treasury attempt", async () => {
    const result = await release({ existing: true });
    assert.equal(result.debit, 0);
    assert.equal(result.inserted, 0);
  });
  it("restores an inherited debit when a retry reaches the provider and fails", async () => {
    const result = await release({ existing: true, reserveOk: true });
    assert.equal(result.debit, 0);
    assert.equal(result.providerCalls, 1);
    assert.equal(result.reversals, 0);
  });
  it("restores a newly inserted debit on provider failure", async () => {
    const result = await release({ reserveOk: true });
    assert.equal(result.debit, 0);
    assert.equal(result.inserted, 1);
  });
  it("retains exactly one UGX 72,000 debit for a successful cash release", async () => {
    const result = await release({ reserveOk: true, cash: true });
    assert.equal(result.debit, -72000);
    assert.equal(result.body.payout_status, "cash_disbursed");
    assert.equal(result.body.service_fee, 1700);
    assert.equal(result.body.total_deducted, 73700);
    assert.equal(result.reversals, 0);
  });
  it("reports restoration failure instead of silently claiming wallet money was returned", async () => {
    const result = await release({ deleteError: true });
    assert.equal(result.debit, -72000);
    assert.match(result.body.error, /Wallet restoration failed: delete refused/);
    assert.match(result.updates.at(-1).payout_error, /Wallet restoration failed/);
  });
  it("blocks release on wallet lookup failure without inserting a duplicate debit", async () => {
    const result = await release({ lookupError: true });
    assert.equal(result.inserted, 0);
    assert.equal(result.providerCalls, 0);
    assert.match(result.body.error, /Wallet lookup failed/);
  });
});