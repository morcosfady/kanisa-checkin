import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const APPROVER = "heavenlyvisions25@gmail.com";

// Create the account (no access yet), then tell the approver by email
export async function POST(req: Request) {
  const { firstName, lastName, email, password } = await req.json();
  const first = String(firstName ?? "").trim();
  const last = String(lastName ?? "").trim();
  const name = `${first} ${last}`.trim();
  if (!first || !last || !email || !password || String(password).length < 8) {
    return NextResponse.json({ error: "Please fill every field. Password needs 8+ characters." }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, first_name: first, last_name: last } } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const origin = new URL(req.url).origin;
  if (process.env.MAILER_URL && process.env.MAILER_TOKEN) {
    await fetch(process.env.MAILER_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        token: process.env.MAILER_TOKEN,
        to: APPROVER,
        subject: `Amoinee: new profile from ${name}`,
        html: `<p><b>${escapeHtml(name)}</b> (${escapeHtml(email)}) created a new profile on Amoinee and is waiting for your approval.</p>
               <p><a href="${origin}/approvals">Open approvals to accept or decline</a></p>`,
      }),
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
