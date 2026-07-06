import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_my_wallet",
  title: "Get my wallet balance",
  description:
    "Return the signed-in employee's wallet balance and recent balance metadata from Great Pearl Coffee.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const email = ctx.getUserEmail();
    if (!email) {
      return { content: [{ type: "text", text: "No email on token" }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data, error } = await supabase.rpc("get_user_balance_safe", { user_email: email });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const balance = Number((data as any)?.wallet_balance ?? 0);
    return {
      content: [
        {
          type: "text",
          text: `Wallet balance for ${email}: UGX ${balance.toLocaleString()}`,
        },
      ],
      structuredContent: { email, balance, raw: data },
    };
  },
});
