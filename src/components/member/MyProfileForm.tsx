"use client";
import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { b, card } from "@/components/ui";
import Combobox, { type Choice } from "@/components/Combobox";
import { isMinor } from "@/lib/members";
import { churchOptions, cityOptions, type ChurchRow, type CityRow } from "@/lib/places";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CONSENT_TEXT, Seg } from "@/components/members/MemberForm";

export type MyProfile = {
  firstName: string; lastName: string; gender: string; dob: string; phone: string; email: string;
  address: string; apartment: string; city: Choice; church: Choice; consent: boolean; signedBy: string;
};

const field = "mt-1 w-full rounded-[8px] border border-line bg-page px-3 py-2.5 text-sm outline-none focus:border-gold";

export default function MyProfileForm({
  initial, existing, cities, churches,
  onboarding = false,
}: { initial: MyProfile; existing: boolean; cities: CityRow[]; churches: ChurchRow[]; onboarding?: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof MyProfile>(k: K, val: MyProfile[K]) => { setSaved(false); setV((p) => ({ ...p, [k]: val })); };

  const cOpts = useMemo(() => cityOptions(cities), [cities]);
  const hOpts = useMemo(() => churchOptions(churches, cities), [churches, cities]);
  // churches in the chosen city first
  const boost = useMemo(() => (o: { id: string }) => (v.city.id && churches.find((c) => c.id === o.id)?.city_id === v.city.id ? 1 : 0), [v.city.id, churches]);

  const minor = isMinor(v.dob || null);
  const alreadySigned = existing && initial.consent;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const missing: string[] = [];
    if (!v.firstName.trim()) missing.push("first name");
    if (!v.lastName.trim()) missing.push("last name");
    if (!v.gender) missing.push("gender");
    if (!v.dob) missing.push("date of birth");
    if (!v.phone.trim()) missing.push("phone");
    if (!v.email.trim()) missing.push("email");
    if (!v.address.trim()) missing.push("address");
    if (!v.city.text.trim()) missing.push("city");
    if (!v.church.text.trim()) missing.push("church");
    if (missing.length) return setError(`Please fill in: ${missing.join(", ")}.`);
    if (v.consent && !alreadySigned && !v.signedBy.trim()) {
      return setError(minor ? "A parent or guardian must type their full name to sign." : "Type your full name to sign the consent.");
    }
    setBusy(true);
    if (!hasSupabase) {
      setBusy(false);
      setSaved(true);
      return toast.success("Profile saved (demo)");
    }
    const { error: err } = await supabaseBrowser().rpc("upsert_my_profile", {
      p_first: v.firstName, p_last: v.lastName, p_gender: v.gender, p_dob: v.dob,
      p_phone: v.phone, p_email: v.email, p_address: v.address, p_apartment: v.apartment,
      p_city_id: v.city.id, p_city_other: v.city.id ? null : v.city.text,
      p_church_id: v.church.id, p_church_other: v.church.id ? null : v.church.text,
      p_consent: v.consent, p_signed_by: v.signedBy,
    });
    setBusy(false);
    if (err) return setError(err.message);
    setSaved(true);
    if (onboarding) {
      toast.success("Profile sent 🙏");
      window.location.href = "/pending"; // full load so the new profile is picked up
      return;
    }
    toast.success(existing ? "Profile updated" : "Profile created. You can check in now 🙏");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className={`${card} mx-auto max-w-xl space-y-5 p-6`} noValidate>
      <p className="text-sm text-muted">All fields are required except apartment and face recognition.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">First name *
          <input value={v.firstName} onChange={(e) => set("firstName", e.target.value)} required className={field} autoComplete="given-name" />
        </label>
        <label className="text-sm font-medium">Last name *
          <input value={v.lastName} onChange={(e) => set("lastName", e.target.value)} required className={field} autoComplete="family-name" />
        </label>
        <div className="text-sm font-medium">Gender *
          <Seg label="Gender" value={v.gender} onChange={(x) => set("gender", x)} options={[["male", "Male"], ["female", "Female"]]} />
        </div>
        <label className="text-sm font-medium">Date of birth *
          <input type="date" value={v.dob} onChange={(e) => set("dob", e.target.value)} required className={field} autoComplete="bday" />
        </label>
        <label className="text-sm font-medium">Phone *
          <input type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} required className={field} autoComplete="tel" />
        </label>
        <label className="text-sm font-medium">Email *
          <input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} required className={field} autoComplete="email" />
        </label>
        <label className="text-sm font-medium sm:col-span-2">Address *
          <input value={v.address} onChange={(e) => set("address", e.target.value)} required placeholder="Street address" className={field} autoComplete="address-line1" />
        </label>
        <label className="text-sm font-medium sm:col-span-2">Apartment / unit (optional)
          <input value={v.apartment} onChange={(e) => set("apartment", e.target.value)} placeholder="Apt, suite or unit" className={field} autoComplete="address-line2" />
        </label>
        <Combobox label="City" required value={v.city} onChange={(c) => set("city", c)} options={cOpts} placeholder="Start typing your city" otherLabel={(t) => `My city is not listed: use “${t}”`} />
        <Combobox label="Church" required value={v.church} onChange={(c) => set("church", c)} options={hOpts} boost={boost} placeholder="Start typing your church" otherLabel={(t) => `My church is not listed: use “${t}”`} />
      </div>

      <fieldset className="rounded-[16px] border border-gold/50 bg-gold/10 p-4">
        <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-heading"><ShieldCheck size={18} strokeWidth={1.75} /> Face recognition (optional)</legend>
        <p className="text-sm leading-relaxed">{CONSENT_TEXT}</p>
        <label className="mt-3 flex items-start gap-3 text-sm font-medium">
          <input type="checkbox" checked={v.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#7a1f2b]" />
          {minor ? "I am the parent or guardian and I consent to face recognition for this child." : "I consent to face recognition for attendance."}
        </label>
        {v.consent && !alreadySigned && (
          <label className="mt-3 block text-sm font-medium">
            {minor ? "Parent or guardian full name (signature) *" : "Type your full name to sign *"}
            <input value={v.signedBy} onChange={(e) => set("signedBy", e.target.value)} className={field} />
          </label>
        )}
        {alreadySigned && v.consent && <p className="mt-2 text-sm text-muted">Signed by {initial.signedBy}. Untick to withdraw; your face data is deleted right away.</p>}
      </fieldset>

      {error && <p role="alert" className="rounded-[8px] bg-danger-tint px-3 py-2 text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {saved && <Link href="/check-in" className="me-auto text-sm font-medium text-heading underline underline-offset-4">Go to check in →</Link>}
        <button disabled={busy} className={b("primary")}>{busy ? "Saving…" : existing ? "Save changes" : onboarding ? "Submit my profile" : "Create my profile"}</button>
      </div>
    </form>
  );
}
