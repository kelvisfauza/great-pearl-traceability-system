import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { financeAccessAllowed, requireFinanceCaller } from "../_shared/finance-access.ts";

Deno.test("active administrator retains Finance access", () => {
  assertEquals(financeAccessAllowed({ status: "Active", disabled: false }, ["Administrator"]), true);
});
Deno.test("Finance process permission grants active staff Finance access", () => {
  assertEquals(financeAccessAllowed({ status: "active", permissions: ["Finance:process"] }, []), true);
  assertEquals(financeAccessAllowed({ status: "Active", permissions: ["Finance:approve"] }, []), true);
});
Deno.test("disabled and archived accounts cannot use Finance actions", () => {
  assertEquals(financeAccessAllowed({ status: "Active", disabled: true }, ["Administrator"]), false);
  assertEquals(financeAccessAllowed({ status: "Archived" }, ["finance_manager"]), false);
});
Deno.test("unrelated permissions and missing employee deny Finance access", () => {
  assertEquals(financeAccessAllowed({ status: "Active", permissions: ["Store Management"] }, []), false);
  assertEquals(financeAccessAllowed(null, ["Administrator"]), false);
});

// No real credentials or external calls: exercise the same guard used by both handlers.
function factoryFor(failed: boolean) {
  return (() => ({
    auth: { getClaims: () => Promise.resolve({ data: { claims: { sub: "staff-id", email: "staff@example.test" } }, error: null }) },
    from: (table: string) => {
      const result = table === "employees"
        ? { data: { status: "Active", disabled: false, permissions: [] }, error: failed ? { message: "connection timeout" } : null }
        : { data: [{ role: "Administrator" }], error: null };
      return { select: () => ({ ilike: () => ({ maybeSingle: () => Promise.resolve(result) }), eq: () => Promise.resolve(result) }) };
    },
  })) as unknown as Parameters<typeof requireFinanceCaller>[2];
}
function setTestEnvironment() {
  Deno.env.set("SUPABASE_URL", "https://finance.example.test");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service");
  Deno.env.set("SUPABASE_ANON_KEY", "test-public");
}
Deno.test("temporary permission read failure returns unavailable, not Forbidden", async () => {
  setTestEnvironment();
  const result = await requireFinanceCaller(new Request("https://finance.example.test", { headers: { Authorization: "Bearer test-user" } }), {}, factoryFor(true));
  assertEquals(result instanceof Response ? result.status : null, 503);
});
Deno.test("verified active administrator survives legacy RPC mismatches", async () => {
  setTestEnvironment();
  const result = await requireFinanceCaller(new Request("https://finance.example.test", { headers: { Authorization: "Bearer test-user" } }), {}, factoryFor(false));
  assertEquals(result instanceof Response, false);
  if (!(result instanceof Response)) assertEquals(result.user?.id, "staff-id");
});
Deno.test("anonymous requests are rejected before data access", async () => {
  setTestEnvironment();
  for (const headers of [new Headers(), new Headers({ Authorization: "Bearer test-public" })]) {
    const result = await requireFinanceCaller(new Request("https://finance.example.test", { headers }), {}, factoryFor(false));
    assertEquals(result instanceof Response ? result.status : null, 401);
  }
});