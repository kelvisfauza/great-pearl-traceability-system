import { requireStaff } from "./internal-auth.ts";

export function mayApproveExternalPayout(requestedBy: string, callerId: string, isAdministrator: boolean, status: string) {
  return isAdministrator && requestedBy !== callerId && status === "pending";
}

export async function prepareExternalPayout(req: Request, db: any, kind: "meal" | "support", input: any, cors: Record<string, string>) {
  const reply = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  const caller = await requireStaff(req, cors);
  if (caller instanceof Response) return { ready: false as const, response: caller };
  if (!caller.userId || !caller.email || !caller.isAdmin) return { ready: false as const, response: reply({ ok: false, success: false, error: "A signed-in authorized employee is required" }) };
  const { data: actor } = await db.from("employees").select("name,status,disabled").ilike("email", caller.email).maybeSingle();
  if (!actor || actor.disabled || String(actor.status).toLowerCase() !== "active") return { ready: false as const, response: reply({ ok: false, success: false, error: "Account unavailable" }) };
  if (input.action !== "approve") {
    const amount = Number(input.amount), charge = Number(input.withdrawCharge || 0);
    const raw = String(input.phone || "").replace(/\D/g, "");
    const phone = raw.startsWith("0") ? "256" + raw.slice(1) : raw;
    const method = input.paymentMethod === "cash" ? "cash" : "mobile_money";
    const name = String(input.receiverName || "").trim();
    const description = String(input.description || "").trim();
    if (!Number.isFinite(amount) || amount < 500 || !Number.isFinite(charge) || charge < 0 || !name || name.length > 100 || !description || description.length > 2000 || (method !== "cash" && !/^256\d{9}$/.test(phone))) {
      return { ready: false as const, response: reply({ ok: false, success: false, error: "Valid recipient, amount, charge and description are required" }) };
    }
    if (kind === "support" && method !== "cash") {
      const local9 = phone.slice(3);
      const { data: staff } = await db.from("employees").select("id").in("phone", [phone, "+" + phone, "0" + local9, local9]).limit(1);
      if (!staff?.length) return { ready: false as const, response: reply({ ok: false, success: false, error: "Support staff payments go only to a phone number saved on an employee record" }) };
    }
    const { data, error } = await db.from("external_payout_requests").insert({
      kind, recipient_name: name, recipient_phone: phone, national_id: input.nationalId || null, description, amount, charge,
      payment_method: method, provider: (input.gateway || input.paymentProvider) === "gosente" ? "gosente" : "yo", notes: input.notes || null,
      requested_by: caller.userId, requested_email: caller.email, requested_name: actor.name || caller.email,
    }).select("id").single();
    if (error) throw error;
    return { ready: false as const, response: reply({ ok: true, success: true, status: "pending", requestId: data.id, message: "Saved for approval by another administrator. No money has been sent." }) };
  }
  const { data: saved, error } = await db.from("external_payout_requests").select("*").eq("id", input.requestId).eq("kind", kind).maybeSingle();
  if (error) throw error;
  const { data: roles, error: roleError } = await db.from("user_roles").select("role").eq("user_id", caller.userId).in("role", ["Administrator", "Super Admin"]);
  if (roleError) throw roleError;
  if (!saved || !mayApproveExternalPayout(saved.requested_by, caller.userId, !!roles?.length, saved.status)) return { ready: false as const, response: reply({ ok: false, success: false, error: "A different administrator must approve this pending payment" }) };
  const { data: claim, error: claimError } = await db.from("external_payout_requests").update({ status: "processing", approved_by: caller.userId, approved_email: caller.email, approved_at: new Date().toISOString() }).eq("id", saved.id).eq("status", "pending").select("id").maybeSingle();
  if (claimError) throw claimError;
  if (!claim) return { ready: false as const, response: reply({ ok: false, success: false, error: "Payment already claimed; refresh its status" }) };
  return { ready: true as const, sourceId: saved.id as string, body: {
    phone: saved.recipient_phone, receiverName: saved.recipient_name, description: saved.description, amount: saved.amount, withdrawCharge: saved.charge,
    nationalId: saved.national_id, notes: saved.notes, paymentMethod: saved.payment_method, gateway: saved.provider, paymentProvider: saved.provider,
    initiatedBy: saved.requested_email, initiatedByName: saved.requested_name,
  } };
}

export async function completeExternalPayout(db: any, sourceId: string, recordId: string, status: string) {
  const { error } = await db.from("external_payout_requests").update({ status: "recorded", result_record_id: recordId, result_status: status }).eq("id", sourceId).eq("status", "processing");
  if (error) throw new Error("Payment outcome needs reconciliation; do not send again");
}