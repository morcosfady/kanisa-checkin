import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import LoginForm from "@/components/LoginForm";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Login() {
  // already signed in: go straight to home
  if (hasSupabase) {
    const { data } = await (await supabaseServer()).auth.getUser();
    if (data.user) redirect("/dashboard");
  }
  return (
    <Shell>
      <LoginForm />
    </Shell>
  );
}
