import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const COMPANY_DOMAIN = "@greatpearlcoffee.com";

const ForceEmailUpdate: React.FC = () => {
  const { user, employee } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = newEmail.trim().toLowerCase();

    // Basic validation
    if (!trimmed) {
      setError("Please enter your new company email.");
      return;
    }

    if (!trimmed.endsWith(COMPANY_DOMAIN)) {
      setError(`Email must end with ${COMPANY_DOMAIN}`);
      return;
    }

    // Very simple email shape check
    if (!/^[^@]+@greatpearlcoffee\.com$/i.test(trimmed)) {
      setError("Please enter a valid company email address.");
      return;
    }

    if (!user) {
      setError("No user session found. Please log in again.");
      return;
    }

    setIsSaving(true);
    try {
      // 1) Update Supabase Auth user
      const { error: authError } = await supabase.auth.updateUser({
        email: trimmed,
      });

      if (authError) {
        console.error("Auth email update error:", authError);
        setError(authError.message || "Failed to update auth email.");
        setIsSaving(false);
        return;
      }

      // 2) Update employees table email to keep things in sync
      if (employee?.id) {
        const { error: empError } = await supabase
          .from("employees")
          .update({ email: trimmed })
          .eq("id", employee.id);

        if (empError) {
          console.error("Employee email update error:", empError);
          setError(empError.message || "Failed to update employee record.");
          setIsSaving(false);
          return;
        }
      }

      setSuccess(true);

      // 3) Sign them out so they can log in with the new email
      // Small delay so they see the success message
      setTimeout(async () => {
        await supabase.auth.signOut();
        // optional: hard redirect to login page
        window.location.href = "/auth";
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError("Something went wrong while updating your email.");
    } finally {
      setIsSaving(false);
    }
  };

  const suggested = React.useMemo(() => {
    if (!employee?.name) return "";
    // Simple suggestion: firstlast@greatpearlcoffee.com
    const clean = employee.name.replace(/\s+/g, "").toLowerCase();
    return `${clean}${COMPANY_DOMAIN}`;
  }, [employee?.name]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-foreground">
          Update your company email
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are currently logged in with{" "}
          <span className="font-mono text-foreground">{user?.email}</span>. <br />
          To continue using the system, please update to your official Great Pearl
          email ending with{" "}
          <span className="font-semibold text-primary">
            {COMPANY_DOMAIN}
          </span>
          .
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              New company email
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={suggested || `yourname${COMPANY_DOMAIN}`}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Example:{" "}
              <span className="font-mono">
                {suggested || `kelvis${COMPANY_DOMAIN}`}
              </span>
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
              Email updated successfully. You will be logged out; please log in
              again with your new company email.
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="mt-2 flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Updating..." : "Save & Log Out"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForceEmailUpdate;
