import { NextResponse } from "next/server";
import { adminEmail, type AdminEmailKind } from "@/lib/email/adminEmail";
import { loadAdminChurch } from "@/lib/kinds";
import { getSession, hasSupabase, isAdminRole } from "@/lib/session";

// Sends the welcome email to a new admin, from the church Gmail through the Apps Script mailer.
// Only an admin can call it, and only for an address that really was just given admin access in their church.
export async function POST(req: Request) {
  if (!hasSupabase) return NextResponse.json({ sent: false, reason: "demo" });
  const { db, user, profile } = await getSession();
  if (!user || !isAdminRole(profile?.role)) return NextResponse.json({ error: "not allowed" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { to?: string; kind?: AdminEmailKind };
  const to = String(body.to ?? "").trim().toLowerCase();
  const kind = body.kind;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || (kind !== "granted" && kind !== "invited" && kind !== "approved")) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { church } = await loadAdminChurch(db, user.id);
  if (!church) return NextResponse.json({ error: "choose your church first" }, { status: 400 });

  // the address must belong to this church's admins or pending invites
  let ok = false;
  if (kind === "invited") {
    const { data } = await db.from("admin_invites").select("email").eq("email", to).eq("church_id", church.id).maybeSingle();
    ok = Boolean(data);
  } else {
    const { data } = await db.rpc("list_admins");
    ok = ((data ?? []) as { email: string }[]).some((a) => a.email?.toLowerCase() === to);
  }
  if (!ok) return NextResponse.json({ error: "no such admin" }, { status: 400 });

  if (!process.env.MAILER_URL || !process.env.MAILER_TOKEN) return NextResponse.json({ sent: false, reason: "mailer not set up" });
  const { subject, html } = adminEmail({ church: church.name, kind, to });
  const res = await fetch(process.env.MAILER_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: process.env.MAILER_TOKEN, to, subject, html }),
  }).catch(() => null);
  const text = res ? await res.text().catch(() => "") : "";
  return NextResponse.json({ sent: Boolean(res?.ok) && text.trim() === "ok", reason: text.trim() === "ok" ? undefined : "mailer refused" });
}
