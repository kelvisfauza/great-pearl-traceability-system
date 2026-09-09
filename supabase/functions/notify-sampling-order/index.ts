import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LAB_RECIPIENTS = [
  { name: "Tumwine Alex", email: "tumwinealex@greatpearlcoffee.com" },
  { name: "Kibaba Nicholus", email: "nickscott@greatpearlcoffee.com" },
  { name: "Morjalia Jadens", email: "bwambalemorjalia@greatpearlcoffee.com" },
  { name: "Niwagaba Gadaffi", email: "nuwagabagadaffi@greatpearlcoffee.com" },
];

const OPERATIONS_EMAIL = "operations@greatpearlcoffee.com";


const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const order = body?.order;
    const pdfBase64: string | undefined = body?.pdf_base64;

    if (!order?.order_number) return json({ ok: false, error: "order details are required" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let pdfUrl = "";
    if (pdfBase64) {
      const cleaned = String(pdfBase64).replace(/^data:[^;]+;base64,/, "");
      const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
      const path = `sampling-orders/${order.order_number}_${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("quality-analysis-files")
        .upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (upErr) console.warn("PDF upload failed:", upErr.message);
      else {
        const { data: signed } = await supabase.storage
          .from("quality-analysis-files")
          .createSignedUrl(path, 60 * 60 * 24 * 30);
        pdfUrl = signed?.signedUrl || "";
      }
    }

    const deliveryTime = order.delivery_time
      ? new Date(order.delivery_time).toLocaleString("en-UG", { timeZone: "Africa/Kampala" })
      : "—";

    const message = [
      "A new sampling order has been created and the sample is on its way to the laboratory for assessment.",
      "",
      "Detail | Value",
      `Sampling Order No. | ${order.order_number}`,
      `Supplier | ${order.supplier_name || "—"}`,
      `Sample Type | ${order.sample_type_label || order.sample_type || "—"}`,
      `Delivery Time to Lab | ${deliveryTime}`,
      `Sampled By | ${order.sampled_by || "—"}`,
      `Created By | ${order.created_by_name || order.created_by_email || "—"}`,
      order.notes ? `Notes | ${order.notes}` : "",
      "",
      pdfUrl
        ? "The full sampling order (with its QR code) is attached as a PDF using the button below."
        : "Please open the Quality module to view the full sampling order.",
    ]
      .filter(Boolean)
      .join("\n");

    const results: any[] = [];
    for (const person of LAB_RECIPIENTS) {
      try {
        const { data, error } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "general-notification",
            recipientEmail: person.email,
            idempotencyKey: `sampling-order-${order.order_number}-${person.email}`,
            templateData: {
              subject: `Incoming Sampling Order ${order.order_number} for Assessment`,
              title: "Incoming Sampling Order",
              recipientName: person.name,
              message,
              ctaUrl: pdfUrl || undefined,
              ctaLabel: pdfUrl ? "Download Sampling Order (PDF)" : undefined,
            },
          },
        });
        results.push({ email: person.email, ok: !error, error: error?.message || (data as any)?.error });
      } catch (e) {
        results.push({ email: person.email, ok: false, error: String((e as any)?.message || e) });
      }
    }

    return json({ ok: true, pdf_url: pdfUrl, results });
  } catch (err) {
    return json({ ok: false, error: String((err as any)?.message || err) });
  }
});
