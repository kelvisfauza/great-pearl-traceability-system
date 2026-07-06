import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyWallet from "./tools/get-my-wallet";
import listMyRecentApprovals from "./tools/list-my-recent-approvals";

// Build the issuer from the project ref (inlined at build time by Vite).
// Must be the direct supabase.co host, never the .lovable.cloud proxy.
const projectRef =
  (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "great-pearl-coffee-mcp",
  title: "Great Pearl Coffee MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Great Pearl Coffee (Great Agro Coffee) operations app. All tools act as the signed-in employee via Supabase RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyWallet, listMyRecentApprovals],
});
