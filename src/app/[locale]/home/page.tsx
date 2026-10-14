import { redirect } from "next/navigation";
import { getSession, hasSupabase, isAdminRole } from "@/lib/session";

// After sign in: admins go to Today, regular users go to Check in
export default async function Home() {
  if (!hasSupabase) redirect("/dashboard");
  const { user, profile } = await getSession();
  if (!user) redirect("/login");
  if (!profile?.approved) redirect("/pending");
  redirect(isAdminRole(profile.role) ? "/dashboard" : "/check-in");
}
