import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { getSession, hasSupabase } from "@/lib/session";

// Personal pages: any signed-in, approved user
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  if (hasSupabase) {
    const { user, profile } = await getSession();
    if (!user) redirect("/login");
    if (!profile?.approved) redirect("/pending");
  }
  return <Shell>{children}</Shell>;
}
