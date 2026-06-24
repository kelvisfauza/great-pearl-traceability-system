import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const formatUGX = (n: number) => `UGX ${Number(n || 0).toLocaleString("en-UG")}`;
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-UG", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const buildReceiptRef = () => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `RCP-${stamp}-${rand}`;
};

interface ServerReceiptInput {
  reference: string;
  paidToName: string;
  paidToPhone: string;
  paidToEmail?: string;
  description: string;
  invoiceNumber?: string;
  amount: number;
  charges: number;
  total: number;
  paymentMethod: string;
  transactionId: string;
  processedBy: string;
}

const generateReceiptPdfBytes = (data: ServerReceiptInput): Uint8Array => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Watermark
  doc.saveGraphicsState();
  // @ts-ignore
  doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(140);
  doc.setTextColor(0, 0, 0);
  doc.text("PAID", pageW / 2, pageH / 2 + 40, { align: "center", angle: 25 });
  doc.restoreGraphicsState();

  // Header band
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GREAT AGRO COFFEE", margin, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("A Member of YEDA Coffee Company Limited", margin, 54);
  doc.setFontSize(8.5);
  doc.text("P.O Box 431420, Kasese, Uganda  •  +256 393 001 626  •  finance@greatpearlcoffee.com", margin, 68);

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PAYMENT RECEIPT", margin, 125);

  // Meta box
  const metaX = pageW - margin - 200;
  const metaY = 105;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.roundedRect(metaX, metaY, 200, 60, 4, 4, "S");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "bold");
  doc.text("RECEIPT NO.", metaX + 10, metaY + 14);
  doc.text("DATE", metaX + 10, metaY + 36);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.text(data.reference, metaX + 10, metaY + 26);
  doc.setFontSize(9.5);
  doc.text(formatDate(new Date().toISOString()), metaX + 10, metaY + 50);

  // Status pill
  doc.setFillColor(235, 235, 235);
  doc.roundedRect(margin, 135, 70, 20, 10, 10, "F");
  doc.roundedRect(margin, 135, 70, 20, 10, 10, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PAID", margin + 35, 149, { align: "center" });

  // Payee
  let y = 195;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("RECEIVED FROM (PAID TO)", margin, y);
  y += 14;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.text(data.paidToName || "—", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Phone: ${data.paidToPhone || "—"}`, margin, y);
  if (data.paidToEmail) {
    y += 12;
    doc.text(`Email: ${data.paidToEmail}`, margin, y);
  }

  // Description
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("PAYMENT DESCRIPTION", margin, y);
  y += 14;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const descLines = doc.splitTextToSize(data.description || "—", pageW - margin * 2);
  doc.text(descLines, margin, y);
  y += descLines.length * 14 + 4;
  if (data.invoiceNumber) {
    doc.setFontSize(9.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Reference Invoice: ${data.invoiceNumber}`, margin, y);
    y += 14;
  }

  // Amount table
  y += 14;
  const tableW = pageW - margin * 2;
  const rowH = 26;
  const rows: [string, string][] = [["Amount", formatUGX(data.amount)]];
  if (data.charges > 0) rows.push(["Mobile Money / Withdrawal Charges", formatUGX(data.charges)]);

  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, tableW, rowH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DESCRIPTION", margin + 12, y + 17);
  doc.text("AMOUNT (UGX)", margin + tableW - 12, y + 17, { align: "right" });
  y += rowH;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 20);
  rows.forEach((r, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 247);
      doc.rect(margin, y, tableW, rowH, "F");
    }
    doc.text(r[0], margin + 12, y + 17);
    doc.text(r[1], margin + tableW - 12, y + 17, { align: "right" });
    y += rowH;
  });

  doc.setFillColor(0, 0, 0);
  doc.rect(margin, y, tableW, rowH + 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL PAID", margin + 12, y + 19);
  doc.text(formatUGX(data.total), margin + tableW - 12, y + 19, { align: "right" });
  y += rowH + 18;

  // Payment details
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT METHOD", margin, y);
  doc.text("TRANSACTION REFERENCE", margin + 220, y);
  doc.text("PROCESSED BY", pageW - margin - 130, y);
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.text(data.paymentMethod, margin, y);
  doc.setFontSize(9);
  const txLines = doc.splitTextToSize(data.transactionId || "—", 180);
  doc.text(txLines, margin + 220, y);
  doc.setFontSize(10);
  const procLines = doc.splitTextToSize(data.processedBy || "—", 130);
  doc.text(procLines, pageW - margin - 130, y);

  // Authorisation
  const sigBoxY = pageH - 130;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.4);
  doc.line(margin, sigBoxY - 8, pageW - margin, sigBoxY - 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text("AUTHORIZED BY", margin, sigBoxY + 2);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(margin, sigBoxY + 40, margin + 180, sigBoxY + 40);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Mukobi Godwin", margin, sigBoxY + 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(`Finance Manager • Signed ${formatDate(new Date().toISOString())}`, margin, sigBoxY + 62);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const validLines = doc.splitTextToSize(
    `Verify authenticity by quoting ref ${data.reference} to finance@greatpearlcoffee.com.`,
    220,
  );
  doc.text(validLines, pageW - margin - 220, sigBoxY + 52);

  // Footer
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.line(margin, pageH - 50, pageW - margin, pageH - 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  doc.text(
    "GREAT AGRO COFFEE  •  P.O Box 431420, Kasese, Uganda  •  +256 393 001 626  •  www.greatpearlcoffee.com",
    pageW / 2, pageH - 35, { align: "center" },
  );
  doc.text("Thank you for doing business with us.", pageW / 2, pageH - 22, { align: "center" });

  return new Uint8Array(doc.output("arraybuffer"));
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(jwt);
    const reviewer = userData?.user;
    if (!reviewer) {
      return new Response(JSON.stringify({ ok: false, error: "Not authenticated" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { submissionId, action, rejectionReason, withdrawCharge, amountOverride } = await req.json();
    if (!submissionId || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid request" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: submission, error: subErr } = await supabase
      .from("provider_submission_requests")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();

    if (subErr || !submission) {
      return new Response(JSON.stringify({ ok: false, error: "Submission not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (submission.status !== "pending") {
      return new Response(
        JSON.stringify({ ok: false, error: `Already ${submission.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get reviewer name
    const { data: emp } = await supabase
      .from("employees")
      .select("name")
      .eq("email", reviewer.email)
      .maybeSingle();
    const reviewerName = emp?.name || reviewer.email || "Admin";

    if (action === "reject") {
      await supabase
        .from("provider_submission_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason || null,
          reviewed_by: reviewer.id,
          reviewed_by_name: reviewerName,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      return new Response(JSON.stringify({ ok: true, status: "rejected" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // APPROVE: insert into target table & trigger Yo payout
    const cleanPhone = normalizePhone(submission.phone);
    const originalAmount = Number(submission.amount);
    const overridden =
      amountOverride !== undefined &&
      amountOverride !== null &&
      Number(amountOverride) > 0 &&
      Number(amountOverride) !== originalAmount;
    const numAmount = overridden ? Number(amountOverride) : originalAmount;
    const numCharge = Number(withdrawCharge || 0);
    const totalAmount = numAmount + numCharge;

    if (!Number.isFinite(numAmount) || numAmount < 500) {
      return new Response(
        JSON.stringify({ ok: false, error: "Amount must be at least 500 UGX" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetTable =
      submission.request_type === "meal_plan"
        ? "meal_disbursements"
        : submission.request_type === "support_staff_per_diem"
          ? "support_staff_per_diem"
          : "service_provider_payments";

    const baseRow: Record<string, unknown> = {
      receiver_phone: cleanPhone,
      receiver_name: submission.provider_name,
      amount: numAmount,
      withdraw_charge: numCharge,
      total_amount: totalAmount,
      yo_status: "pending",
      initiated_by: reviewer.id,
      initiated_by_name: overridden
        ? `${reviewerName} (self-submitted, amount adjusted from ${originalAmount.toLocaleString()})`
        : `${reviewerName} (self-submitted)`,
    };
    if (targetTable === "service_provider_payments") {
      baseRow.service_description = submission.description;
      baseRow.notes = submission.invoice_number
        ? `Invoice: ${submission.invoice_number}`
        : null;
    } else if (targetTable === "support_staff_per_diem") {
      baseRow.description = submission.description;
      baseRow.national_id = (submission as any).national_id || null;
      baseRow.payment_method = "mobile_money";
      baseRow.notes = submission.invoice_number
        ? `Ref: ${submission.invoice_number}`
        : null;
    } else {
      baseRow.description = submission.description;
    }

    // 🔁 RETRY-AWARE: if a previous attempt for this submission failed, reuse the
    // existing payout row instead of creating a duplicate. The submission stays
    // 'pending' on failure (see below) so admin can re-click Approve & Pay.
    let record: any = null;
    if ((submission as any).payout_record_id && (submission as any).payout_status === "failed") {
      const { data: existing } = await supabase
        .from(targetTable)
        .select("*")
        .eq("id", (submission as any).payout_record_id)
        .maybeSingle();
      if (existing) {
        const { data: updated, error: updErr } = await supabase
          .from(targetTable)
          .update({
            ...baseRow,
            yo_status: "pending",
            yo_reference: null,
            yo_raw_response: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (!updErr) record = updated;
      }
    }

    if (!record) {
      const { data: inserted, error: insertErr } = await supabase
        .from(targetTable)
        .insert(baseRow)
        .select()
        .single();
      if (insertErr || !inserted) {
        console.error("Insert error:", insertErr);
        return new Response(
          JSON.stringify({ ok: false, error: "Failed to create payout record" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      record = inserted;
    }

    // ✅ APPROVAL NOTIFICATION — sent immediately, before the Yo payout result.
    // Only sent the first time (not on retry of a previously failed payout).
    const isRetry = (submission as any).payout_status === "failed";
    if (!isRetry) {
      try {
        const approvalSms = `Dear ${submission.provider_name}, your request to Great Agro Coffee for UGX ${numAmount.toLocaleString()} (${submission.description}) has been APPROVED by ${reviewerName}. Disbursement is being processed and you will receive a confirmation message shortly.`;
        await supabase.functions.invoke("send-sms", {
          body: {
            phone: cleanPhone,
            message: approvalSms,
            userName: submission.provider_name,
            messageType: "approval",
            department: "Admin",
            triggeredBy: reviewer.id,
          },
        });
      } catch (e) {
        console.error("Approval SMS error:", e);
      }

      if (submission.email) {
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "payment-receipt",
              recipientEmail: submission.email,
              idempotencyKey: `provider-submission-approval-${submissionId}`,
              templateData: {
                recipientName: submission.provider_name,
                reference: submissionId.slice(-8).toUpperCase(),
                description: `APPROVED — ${submission.description}. Disbursement is being processed; you will receive a confirmation once funds are sent.`,
                invoiceNumber: submission.invoice_number || undefined,
                amount: `UGX ${numAmount.toLocaleString()}`,
                charges: numCharge > 0 ? `UGX ${numCharge.toLocaleString()}` : undefined,
                total: `UGX ${totalAmount.toLocaleString()}`,
                paymentMethod: "Pending disbursement",
                transactionId: submissionId,
                processedBy: reviewerName,
              },
            },
          });
        } catch (e) {
          console.error("Approval email error:", e);
        }
      }
    }

    // Trigger Yo Payout
    const narrative =
      submission.request_type === "meal_plan"
        ? `Meal plan payment - ${submission.description} - ${submission.provider_name}`
        : submission.request_type === "support_staff_per_diem"
          ? `Support staff per-diem - ${submission.description} - ${submission.provider_name}`
          : `Service provider payment - ${submission.description} - ${submission.provider_name}`;

    // Generate our own PrivateTransactionReference so the every-2-minute poller
    // can always look up status at Yo (even when Yo doesn't echo back a TransactionReference,
    // e.g. when StatusCode=-22 "pending authorization").
    const privateRef = `PSUB-${record.id.slice(0, 8)}-${Date.now()}`;
    const result = await yoPayout({ phone: cleanPhone, amount: totalAmount, narrative, privateRef });

    const rawResp = result.rawResponse || "";
    const isPending22 =
      result.statusMessage?.includes("-22") || rawResp.includes("<StatusCode>-22</StatusCode>");

    let yoStatus = "failed";
    let displayMessage = result.errorMessage || "Payment failed";
    if (result.success) {
      yoStatus = "success";
      displayMessage = "Payment sent successfully";
    } else if (isPending22) {
      yoStatus = "pending_approval";
      displayMessage = "Payment sent, pending authorization in Yo dashboard";
    }

    await supabase
      .from(targetTable)
      .update({
        // Persist our private ref as fallback so the poller has something to query.
        yo_reference: result.transactionRef || privateRef,
        yo_status: yoStatus,
        yo_raw_response: rawResp || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    // 🔁 If Yo failed (e.g. account not funded), keep submission as 'pending'
    // so it stays in the approval list and admin can re-click Approve & Pay
    // once the Yo wallet is funded. The existing payout record is reused on retry.
    const submissionStatus = yoStatus === "failed" ? "pending" : "paid";
    await supabase
      .from("provider_submission_requests")
      .update({
        status: submissionStatus,
        reviewed_by: reviewer.id,
        reviewed_by_name: reviewerName,
        reviewed_at: new Date().toISOString(),
        payout_record_id: record.id,
        payout_status: yoStatus,
        payout_message: displayMessage,
      })
      .eq("id", submissionId);

    // Notify provider via SMS
    try {
      if (yoStatus === "success" || yoStatus === "pending_approval") {
        const shortRef = (result.transactionRef || record.id).slice(-8).toUpperCase();
        const smsMessage = `Dear ${submission.provider_name}, UGX ${totalAmount.toLocaleString()} has been sent from Great Agro Coffee. Ref: ${shortRef}. Thank you.`;
        // (PDF link added in disbursement email below; SMS kept short to avoid extra segments)
        await supabase.functions.invoke("send-sms", {
          body: {
            phone: cleanPhone,
            message: smsMessage,
            userName: submission.provider_name,
            messageType: "payout_confirmation",
            department: "Finance",
            triggeredBy: reviewer.id,
          },
        });
      }
    } catch (e) {
      console.error("SMS notify error:", e);
    }

    // Notify provider via Email
    try {
      if (yoStatus === "success" || yoStatus === "pending_approval") {
        const shortRef = (result.transactionRef || record.id).slice(-8).toUpperCase();

        // 📄 Generate signed PDF receipt and upload to payment-receipts bucket so
        // the email carries a "Download PDF Receipt" button (matches the Finance
        // payout flow). Reference uses RCP-YYYYMMDD-XXXXX so /receipt-link can
        // resolve it later.
        let pdfUrl: string | undefined;
        const pdfRef = buildReceiptRef();
        try {
          const pdfBytes = generateReceiptPdfBytes({
            reference: pdfRef,
            paidToName: submission.provider_name,
            paidToPhone: cleanPhone,
            paidToEmail: submission.email || undefined,
            description: submission.description,
            invoiceNumber: submission.invoice_number || undefined,
            amount: numAmount,
            charges: numCharge,
            total: totalAmount,
            paymentMethod: "Mobile Money (Yo Payments)",
            transactionId: result.transactionRef || record.id,
            processedBy: reviewerName,
          });
          const year = new Date().getFullYear();
          const path = `${year}/${pdfRef}.pdf`;
          const { error: upErr } = await supabase.storage
            .from("payment-receipts")
            .upload(path, pdfBytes, {
              contentType: "application/pdf",
              upsert: true,
              cacheControl: "3600",
            });
          if (upErr) {
            console.error("PDF upload error:", upErr);
          } else {
            const { data: signed } = await supabase.storage
              .from("payment-receipts")
              .createSignedUrl(path, 60 * 60 * 24 * 365);
            pdfUrl = signed?.signedUrl;
          }
        } catch (e) {
          console.error("PDF generation error:", e);
        }

        if (!submission.email) {
          // No email recipient — skip email but still try to send PDF link via SMS if generated
          if (pdfUrl) {
            try {
              const supaUrl = Deno.env.get("SUPABASE_URL")!;
              const link = `${supaUrl}/functions/v1/receipt-link?ref=${encodeURIComponent(pdfRef)}`;
              await supabase.functions.invoke("send-sms", {
                body: {
                  phone: cleanPhone,
                  message: `Great Agro Coffee — Download your receipt ${pdfRef}: ${link}`,
                  userName: submission.provider_name,
                  messageType: "payout_confirmation",
                  department: "Finance",
                  triggeredBy: reviewer.id,
                },
              });
            } catch (e) {
              console.error("PDF SMS error:", e);
            }
          }
        } else {
          await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "payment-receipt",
            recipientEmail: submission.email,
            idempotencyKey: `provider-submission-${submissionId}`,
            templateData: {
              recipientName: submission.provider_name,
              reference: shortRef,
              description: submission.description,
              invoiceNumber: submission.invoice_number || undefined,
              amount: `UGX ${numAmount.toLocaleString()}`,
              charges: numCharge > 0 ? `UGX ${numCharge.toLocaleString()}` : undefined,
              total: `UGX ${totalAmount.toLocaleString()}`,
              paymentMethod: "Mobile Money (Yo Payments)",
              transactionId: result.transactionRef || record.id,
              processedBy: reviewerName,
                pdfUrl,
            },
          },
        });
        }
      }
    } catch (e) {
      console.error("Email notify error:", e);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: yoStatus,
        message: displayMessage,
        recordId: record.id,
        ref: result.transactionRef,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-provider-submission error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});