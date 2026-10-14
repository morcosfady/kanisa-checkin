import { redirect } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import LoginForm from "@/components/LoginForm";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/next-url";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const dest = safeNext(next);
  // already signed in: go straight to home
  if (hasSupabase) {
    const { data } = await (await supabaseServer()).auth.getUser();
    if (data.user) redirect(dest ?? "/home");
  }
  return (
    <AuthLayout>
      <LoginForm next={dest} />
    </AuthLayout>
  );
}
