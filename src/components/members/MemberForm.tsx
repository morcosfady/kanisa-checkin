"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cross, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { b } from "@/components/ui";
import { isMinor, type FamilyOption, type Member } from "@/lib/members";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";

const NEW_FAMILY = "__new";
export const CONSENT_TEXT =
  "Amoinee keeps a numeric face template (never a photo) only to record attendance. It is kept until consent is withdrawn or 12 months after the last visit, and it is never sold or shared. Consent can be withdrawn any time and the data is deleted immediately. Without consent you can still check in by QR code or name.";
const field = "mt-1 w-full rounded-[8px] border border-line bg-page px-3 py-2.5 text-sm outline-none focus:border-gold";

export function Seg({ value, options, onChange, label }: { value: string; options: [string, string][]; onChange: (v: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="mt-1 flex gap-2">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`flex-1 rounded-[12px] border px-3 py-2 text-sm font-medium transition ${
            value === v ? "border-coptic bg-coptic text-white" : "border-line bg-page hover:bg-hover"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export default function MemberForm({
  open, member, families, onClose, onSaved,
}: {
  open: boolean;
  member: Member | null; // null = add
  families: FamilyOption[];
  onClose: () => void;
  onSaved: (m: Member) => void; // used in demo mode; real mode refreshes from the server
}) {
  return (
    <AnimatePresence>
      {open && <Inner key={member?.id ?? "new"} member={member} families={families} onClose={onClose} onSaved={onSaved} />}
    </AnimatePresence>
  );
}

function Inner({ member, families, onClose, onSaved }: { member: Member | null; families: FamilyOption[]; onClose: () => void; onSaved: (m: Member) => void }) {
  const [first, setFirst] = useState(member?.firstName ?? "");
  const [last, setLast] = useState(member?.lastName ?? "");
  const [gender, setGender] = useState<string>(member?.gender ?? "male");
  const [deacon, setDeacon] = useState(member?.deacon ?? false);
  const [dob, setDob] = useState(member?.dob ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [status, setStatus] = useState<string>(member?.status ?? "active");
  const [familyId, setFamilyId] = useState(member?.familyId ?? "");
  const [newFamily, setNewFamily] = useState("");
  const [consent, setConsent] = useState(member?.consent ?? false);
  const [signature, setSignature] = useState(member?.signedBy ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  const minor = isMinor(dob || null);
  const alreadySigned = Boolean(member?.consent);

  useEffect(() => {
    firstRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!first.trim() || !last.trim()) return setError("First and last name are required.");
    if (familyId === NEW_FAMILY && !newFamily.trim()) return setError("Enter the new family name.");
    if (consent && !alreadySigned && !signature.trim()) {
      return setError(minor ? "A parent or guardian must type their full name to sign." : "Type your full name to sign the consent.");
    }
    setBusy(true);

    const familyName = familyId === NEW_FAMILY ? newFamily.trim() : families.find((f) => f.id === familyId)?.name ?? "No family";
    const signNow = consent && !alreadySigned;
    const result: Member = {
      id: member?.id ?? `local-${Date.now()}`,
      name: `${first.trim()} ${last.trim()}`,
      firstName: first.trim(),
      lastName: last.trim(),
      gender: gender as Member["gender"],
      deacon,
      family: familyName,
      familyId: familyId === NEW_FAMILY ? null : familyId || null,
      status: status as Member["status"],
      consent,
      face: !consent ? "none" : member?.face === "enrolled" ? "enrolled" : "pending",
      phone: phone.trim(),
      email: email.trim(),
      dob: dob || null,
      className: member?.className ?? "",
      lastDays: member?.lastDays ?? null,
      rate: member?.rate ?? null,
      streak: member?.streak ?? null,
      signedAt: signNow ? new Date().toISOString() : member?.signedAt ?? null,
      signedBy: signNow ? signature.trim() : member?.signedBy ?? null,
    };

    if (!hasSupabase) {
      setBusy(false);
      onSaved(result);
      toast.success(member ? `${result.name} updated (demo)` : `${result.name} added (demo)`);
      return onClose();
    }

    try {
      const db = supabaseBrowser();
      const { data: auth } = await db.auth.getUser();
      let fid: string | null = familyId && familyId !== NEW_FAMILY ? familyId : null;
      if (familyId === NEW_FAMILY) {
        const { data, error: fe } = await db.from("families").insert({ family_name: newFamily.trim() }).select("id").single();
        if (fe) throw fe;
        fid = data.id;
      }
      const payload = {
        first_name: first.trim(),
        last_name: last.trim(),
        gender,
        is_deacon: deacon,
        date_of_birth: dob || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        is_minor: minor,
        family_id: fid,
        status,
        biometric_consent: consent,
        ...(signNow ? { consent_signed_at: new Date().toISOString(), consent_signed_by: signature.trim() } : {}),
      };
      const q = member
        ? db.from("members").update(payload).eq("id", member.id).select("id").single()
        : db.from("members").insert(payload).select("id").single();
      const { data: saved, error: me } = await q;
      if (me) throw me;

      const logs = [{ actor_id: auth.user?.id, action: member ? "member_updated" : "member_created", target: saved.id }];
      if (signNow) logs.push({ actor_id: auth.user?.id, action: "consent_signed", target: saved.id });
      if (member && member.consent && !consent) logs.push({ actor_id: auth.user?.id, action: "consent_withdrawn", target: saved.id });
      await db.from("audit_log").insert(logs);

      toast.success(member ? `${result.name} updated` : `${result.name} added`);
      onSaved({ ...result, id: saved.id });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as { message?: string }).message ?? "Could not save. Try again.");
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center sm:p-4"
      onClick={onClose}
    >
      <motion.form
        onSubmit={submit}
        role="dialog" aria-modal="true" aria-labelledby="mf-title"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[24px] border border-line bg-card shadow-lift sm:rounded-[24px]"
      >
        <div className="flex items-center gap-3 border-b border-line bg-coptic px-5 py-4 text-cream">
          <h2 id="mf-title" className="me-auto font-display text-xl font-semibold">{member ? "Edit member" : "Add member"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-[8px] hover:bg-white/10"><X size={20} /></button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">First name *
              <input ref={firstRef} value={first} onChange={(e) => setFirst(e.target.value)} required className={field} />
            </label>
            <label className="text-sm font-medium">Last name *
              <input value={last} onChange={(e) => setLast(e.target.value)} required className={field} />
            </label>
            <div className="text-sm font-medium">Gender *
              <Seg label="Gender" value={gender} onChange={setGender} options={[["male", "Male"], ["female", "Female"]]} />
            </div>
            <div className="text-sm font-medium">Deacon
              <Seg label="Deacon" value={deacon ? "yes" : "no"} onChange={(v) => setDeacon(v === "yes")} options={[["no", "No"], ["yes", "Yes"]]} />
            </div>
            <label className="text-sm font-medium">Date of birth
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={field} />
            </label>
            <label className="text-sm font-medium">Status
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
                <option value="active">Active</option>
                <option value="visitor">Visitor</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="text-sm font-medium">Phone
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
            </label>
            <label className="text-sm font-medium">Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </label>
            <label className="text-sm font-medium sm:col-span-2">Family
              <select value={familyId} onChange={(e) => setFamilyId(e.target.value)} className={field}>
                <option value="">No family yet</option>
                {families.map((f) => <option key={f.id} value={f.id}>{f.name} family</option>)}
                <option value={NEW_FAMILY}>+ New family…</option>
              </select>
            </label>
            {familyId === NEW_FAMILY && (
              <label className="text-sm font-medium sm:col-span-2">New family name
                <input value={newFamily} onChange={(e) => setNewFamily(e.target.value)} placeholder="Example: Girgis" className={field} />
              </label>
            )}
          </div>

          <fieldset className="rounded-[16px] border border-gold/50 bg-gold/10 p-4">
            <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-heading"><ShieldCheck size={18} strokeWidth={1.75} /> Face recognition consent</legend>
            <p className="text-sm leading-relaxed text-ink/90">
              Amoinee keeps a numeric face template (never a photo) only to record attendance. It is kept until consent is withdrawn
              or 12 months after the last visit, and it is never sold or shared. Consent can be withdrawn any time and the data is deleted immediately.
              Without consent this person can still check in by QR code or name.
            </p>
            {alreadySigned ? (
              <p className="mt-3 text-sm">
                Consent signed by <b>{member?.signedBy}</b>{member?.signedAt ? ` on ${new Date(member.signedAt).toLocaleDateString("en-US")}` : ""}.{" "}
                <button type="button" onClick={() => setConsent(!consent)} className="font-medium text-heading underline underline-offset-4">
                  {consent ? "Withdraw consent" : "Undo"}
                </button>
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <label className="flex items-start gap-3 text-sm font-medium">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#7a1f2b]" />
                  {minor ? "I am the parent or guardian and I consent to face recognition for this child." : "I consent to face recognition for attendance."}
                </label>
                {consent && (
                  <label className="block text-sm font-medium">
                    {minor ? "Parent or guardian full name (signature) *" : "Type your full name to sign *"}
                    <input value={signature} onChange={(e) => setSignature(e.target.value)} className={field} />
                    <span className="mt-1 block text-xs font-normal text-muted">Signed on {new Date().toLocaleDateString("en-US")}</span>
                  </label>
                )}
              </div>
            )}
          </fieldset>

          {error && <p role="alert" className="rounded-[8px] bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-line p-4">
          <button type="button" onClick={onClose} className={b("secondary")}>Cancel</button>
          <button disabled={busy} className={b("primary")}>
            <Cross size={16} strokeWidth={1.75} /> {busy ? "Saving…" : member ? "Save changes" : "Add member"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
