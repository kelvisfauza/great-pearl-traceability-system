import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function safeNext(): string {
  const path = window.location.pathname + window.location.search;
  return path.startsWith("/") ? path : "/";
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        window.location.href = "/auth?next=" + encodeURIComponent(safeNext());
        return;
      }
      const { data, error } = await (supabase.auth as any).oauth.getAuthorizationDetails(
        authorizationId,
      );
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const oauth = (supabase.auth as any).oauth;
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Authorize access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-destructive text-sm">{error}</p>}
          {!details && !error && <p className="text-muted-foreground">Loading…</p>}
          {details && (
            <>
              <p>
                <strong>{details.client?.name ?? "An external app"}</strong> is requesting to
                connect to your Great Pearl Coffee account and use tools as you.
              </p>
              <p className="text-sm text-muted-foreground">
                Only approve if you initiated this connection from a trusted app (e.g. ChatGPT,
                Claude, Cursor).
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
                  Deny
                </Button>
                <Button disabled={busy} onClick={() => decide(true)}>
                  Approve
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
