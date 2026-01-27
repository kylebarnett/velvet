// Supabase Edge Function: send-metric-request-notification
// Sends an email to the founder when an investor creates a metric request.

import { corsHeaders } from "../_shared/cors.ts";

type Payload = {
  to: string;
  companyName: string;
  investorName?: string;
  portalUrl: string;
  metricName: string;
  dueDate?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    if (!body?.to || !body?.portalUrl || !body?.metricName) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = `Metric request for ${body.companyName}`;
    const html = `
      <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5">
        <h2 style="margin: 0 0 8px 0">You have a new metric request</h2>
        <p style="margin: 0 0 12px 0">
          ${body.investorName ? `<strong>${body.investorName}</strong>` : "An investor"} requested <strong>${body.metricName}</strong>
          for <strong>${body.companyName}</strong>.
        </p>
        ${body.dueDate ? `<p style="margin: 0 0 12px 0">Due: <strong>${body.dueDate}</strong></p>` : ""}
        <p style="margin: 0 0 16px 0">
          <a href="${body.portalUrl}" style="display: inline-block; background: #111; color: #fff; padding: 10px 14px; border-radius: 8px; text-decoration: none">
            Open portal
          </a>
        </p>
        <p style="margin: 0; color: #666; font-size: 12px">Velvet</p>
      </div>
    `;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Velvet <no-reply@velvet.local>",
        to: [body.to],
        subject,
        html,
      }),
    });

    if (!resendResp.ok) {
      const text = await resendResp.text();
      return new Response(JSON.stringify({ error: text || "Email failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resendResp.json();
    return new Response(JSON.stringify(json), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

