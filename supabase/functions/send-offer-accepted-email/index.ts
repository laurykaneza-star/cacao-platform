import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("CONTRACT_FROM_EMAIL") || "onboarding@resend.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      buyerEmail,
      buyerName,
      contractNumber,
      batchCode,
      priceUsdPerKg,
      volumeKg,
      currency,
      incoterm,
      paymentTerms,
      validUntil,
      totalValueUsd,
    } = await req.json();

    if (!buyerEmail) {
      return new Response(JSON.stringify({ error: "buyerEmail is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1C1009;">
        <div style="background:#3B2314;padding:20px 28px;border-radius:8px 8px 0 0;">
          <span style="color:#FAF6F0;font-size:18px;font-weight:600;">&#9670; Organic Cacao de Lukolela</span>
        </div>
        <div style="padding:28px;border:1px solid #E5DDD3;border-top:none;border-radius:0 0 8px 8px;">
          <h2 style="margin-top:0;color:#3B2314;">Your offer has been accepted</h2>
          <p>Dear ${buyerName || "Valued Buyer"},</p>
          <p>We're pleased to confirm that your offer on batch <strong>${batchCode}</strong> has been accepted. A contract has been generated for this transaction.</p>

          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
            <tr><td style="padding:6px 0;color:#8B6555;">Contract number</td><td style="padding:6px 0;font-weight:600;">${contractNumber}</td></tr>
            <tr><td style="padding:6px 0;color:#8B6555;">Batch</td><td style="padding:6px 0;">${batchCode}</td></tr>
            <tr><td style="padding:6px 0;color:#8B6555;">Price</td><td style="padding:6px 0;">${currency} ${priceUsdPerKg?.toFixed ? priceUsdPerKg.toFixed(2) : priceUsdPerKg} / kg</td></tr>
            <tr><td style="padding:6px 0;color:#8B6555;">Volume</td><td style="padding:6px 0;">${volumeKg} kg</td></tr>
            <tr><td style="padding:6px 0;color:#8B6555;">Total value</td><td style="padding:6px 0;font-weight:600;">${currency} ${totalValueUsd?.toFixed ? totalValueUsd.toFixed(2) : totalValueUsd}</td></tr>
            <tr><td style="padding:6px 0;color:#8B6555;">Incoterm</td><td style="padding:6px 0;">${incoterm}</td></tr>
            <tr><td style="padding:6px 0;color:#8B6555;">Payment terms</td><td style="padding:6px 0;">${paymentTerms || "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#8B6555;">Valid until</td><td style="padding:6px 0;">${validUntil || "—"}</td></tr>
          </table>

          <p>Our team will be in touch shortly to confirm shipping arrangements and next steps.</p>
          <p style="margin-top:24px;">Thank you for your partnership.</p>
          <p style="color:#8B6555;font-size:13px;margin-top:28px;border-top:1px solid #E5DDD3;padding-top:14px;">
            Organic Cacao de Lukolela &middot; FOB Matadi &middot; Kongo Central, DRC
          </p>
        </div>
      </div>
    `;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Organic Cacao de Lukolela <${FROM_EMAIL}>`,
        to: [buyerEmail],
        subject: `Offer accepted — Contract ${contractNumber} (${batchCode})`,
        html,
      }),
    });

    const result = await resendResp.json();

    if (!resendResp.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new
