import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api/auth";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return jsonError("Missing RESEND_API_KEY.", 500);

  const { to, subject, html } = parsed.data;

  // Minimal Resend integration (server-side)
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Velvet <no-reply@velvet.local>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return jsonError(`Email failed: ${text || res.statusText}`, 400);
  }

  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json);
}

