"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Mail, ShieldCheck, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import ChurchGate from "@/components/ChurchGate";
import ConfirmDialog from "@/components/members/ConfirmDialog";
import type { AdminChurch } from "@/lib/kinds";
import type { ChurchRow, CityRow } from "@/lib/places";
import { Avatar, Badge, b, card } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";

export type AdminRow = { id: string; name: string; email: string; church: string; isYou: boolean; isSuper?: boolean };
export type InviteRow = { email: string; church: string };

export default function AdminAccess({ admins, invites, church, churches, cities }: { admins: AdminRow[]; invites: InviteRow[]; church: AdminChurch; churches: ChurchRow[]; cities: CityRow[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [localAdmins, setLocalAdmins] = useState(admins);
  const [localInvites, setLocalInvites] = useState(invites);
  const [remove, setRemove] = useState<AdminRow | null>(null);

  const list = hasSupabase ? admins : localAdmins;
  const waiting = hasSupabase ? invites : localInvites;

  if (!church) return <ChurchGate churches={churches} cities={cities} />;

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return setError("Enter a valid email address.");
    setBusy(true);
    if (!hasSupabase) {
      setLocalInvites((l) => (l.some((x) => x.email === value) ? l : [...l, { email: value, church: church!.name }]));
      setBusy(false);
      setEmail("");
      return toast.success(`${value} will be an admin when they sign up (demo)`);
    }
    const { data, error: err } = await supabaseBrowser().rpc("grant_admin", { p_email: value, p_church: church!.id });
    setBusy(false);
    if (err) return setError(err.message);
    setEmail("");
    toast.success(data.status === "promoted" ? `${data.email} is now an admin` : `${data.email} will be an admin as soon as they sign up`);
    router.refresh();
  }

  async function revoke(a: AdminRow) {
    setRemove(null);
    if (!hasSupabase) return setLocalAdmins((l) => l.filter((x) => x.id !== a.id));
    const { error: err } = await supabaseBrowser().rpc("revoke_admin", { p_user: a.id });
    if (err) return toast.error(err.message);
    toast.success(`${a.name} is no longer an admin`);
    router.refresh();
  }

  async function dropInvite(addr: string) {
    if (!hasSupabase) return setLocalInvites((l) => l.filter((x) => x.email !== addr));
    const { error: err } = await supabaseBrowser().from("admin_invites").delete().eq("email", addr);
    if (err) return toast.error(err.message);
    toast.success("Invite removed");
    router.refresh();
  }

  return (
    <section className={`${card} space-y-5 p-5`} aria-labelledby="admin-access">
      <div>
        <h2 id="admin-access" className="flex items-center gap-2 font-display text-2xl font-semibold text-heading">
          <ShieldCheck size={22} strokeWidth={1.75} /> Admin access
        </h2>
        <p className="mt-1 text-sm text-muted">
          Give someone admin access to <b>{church.name}</b> by email. An admin manages one church only. If they don’t have an account yet, they become an admin automatically the first time they sign up with that email.
        </p>
      </div>

      <form onSubmit={grant} className="flex flex-wrap gap-3">
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">Email address</span>
          <Mail size={18} strokeWidth={1.75} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            className="w-full rounded-[8px] border border-line bg-page py-2.5 ps-10 pe-3 text-sm outline-none focus:border-gold"
          />
        </label>
        <button disabled={busy} className={b("primary")}>{busy ? "Granting…" : "Grant admin access"}</button>
      </form>
      {error && <p role="alert" className="rounded-[8px] bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Admins</h3>
        <ul className="divide-y divide-line rounded-[12px] border border-line">
          <AnimatePresence initial={false}>
            {list.map((a) => (
              <motion.li key={a.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 20 }} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <Avatar name={a.name} size={36} />
                <div className="me-auto min-w-0">
                  <div className="flex items-center gap-2 font-medium">{a.name} {a.isYou && <Badge tone="gold">You</Badge>}</div>
                  <div className="truncate text-sm text-muted">{a.email}</div>
                  <div className="text-xs text-goldtext">{a.isSuper ? "Super admin · all churches" : a.church}</div>
                </div>
                {!a.isYou && !a.isSuper && (
                  <button onClick={() => setRemove(a)} className={b("danger")}><UserMinus size={16} strokeWidth={1.75} /> Remove admin</button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      {waiting.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Waiting to sign up</h3>
          <ul className="divide-y divide-line rounded-[12px] border border-line">
            {waiting.map(({ email: addr, church: ch }) => (
              <li key={addr} className="flex items-center gap-3 px-3 py-2.5">
                <Clock size={18} strokeWidth={1.75} className="text-goldtext" />
                <span className="me-auto truncate">{addr} <span className="text-xs text-muted">· {ch}</span></span>
                <button onClick={() => dropInvite(addr)} aria-label={`Remove invite for ${addr}`} className="grid h-8 w-8 place-items-center rounded-[8px] text-danger hover:bg-danger-tint"><X size={16} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(remove)}
        title="Remove admin access?"
        body={remove ? `${remove.name} will become a regular user and lose access to members, Today, approvals and the kiosk.` : ""}
        confirmLabel="Remove admin"
        onCancel={() => setRemove(null)}
        onConfirm={() => remove && revoke(remove)}
      />
    </section>
  );
}
