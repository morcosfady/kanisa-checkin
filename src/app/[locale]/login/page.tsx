import { getTranslations } from "next-intl/server";
import Shell from "@/components/Shell";

export default async function Login() {
  const t = await getTranslations("login");
  return (
    <Shell>
      <form className="mx-auto max-w-sm space-y-3 rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-bold text-coptic">{t("title")}</h1>
        <label className="block">{t("email")}<input type="email" className="mt-1 w-full rounded border p-2" /></label>
        <label className="block">{t("password")}<input type="password" className="mt-1 w-full rounded border p-2" /></label>
        <button type="button" className="w-full rounded bg-coptic p-2 text-white">{t("submit")}</button>
      </form>
    </Shell>
  );
}
