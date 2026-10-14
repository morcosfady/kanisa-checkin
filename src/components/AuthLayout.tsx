import { Logo } from "@/components/Logo";
import { Link } from "@/i18n/navigation";
import SacredBackground from "@/components/SacredBackground";

// Split layout for sign in / request access
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <aside className="relative hidden overflow-hidden text-cream md:block">
        <SacredBackground panel />
        <div className="relative flex h-full flex-col items-center justify-center gap-8 p-12 text-center">
          <Logo size={88} stacked />
          <div>
            <p className="font-display text-3xl font-semibold">Come, let us worship</p>
            <p className="mt-2 font-[family-name:var(--font-coptic)] text-lg tracking-wider text-gold-light">ⲁⲙⲱⲓⲛⲓ ⲙⲁⲣⲉⲛⲟⲩⲱϣⲧ</p>
          </div>
        </div>
      </aside>
      <div className="relative flex flex-col items-center justify-center gap-6 p-6">
        <SacredBackground light />
        <div className="rounded-[16px] bg-coptic px-5 py-3 md:hidden"><Logo size={40} /></div>
        {children}
        <Link href="/privacy" className="text-xs text-muted underline-offset-4 hover:underline">Privacy</Link>
      </div>
    </div>
  );
}
