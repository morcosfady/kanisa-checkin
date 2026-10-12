import { defineRouting } from "next-intl/routing";

// English only; no locale in the URL
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});
