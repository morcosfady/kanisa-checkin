import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { adminEmail } from "../../src/lib/email/adminEmail";

describe("admin welcome email", () => {
  it("names the church and the person's address", () => {
    const { subject, html } = adminEmail({ church: "St. Philopateer Coptic Orthodox Church", kind: "granted", to: "abouna@example.com" });
    expect(subject).toContain("St. Philopateer");
    expect(html).toContain("You are now an admin");
    expect(html).toContain("abouna@example.com");
    expect(html).toContain("/login");
  });
  it("tells invited people to create a profile with that email", () => {
    const { html } = adminEmail({ church: "St. Mark", kind: "invited", to: "new@example.com" });
    expect(html).toContain("Create a new profile");
  });
  it("uses its own wording when a request is approved", () => {
    const { subject, html } = adminEmail({ church: "St. Mark", kind: "approved", to: "a@example.com" });
    expect(subject).toContain("approved");
    expect(html).toContain("approved your request");
  });
  it("cannot be used to inject html", () => {
    const { html } = adminEmail({ church: "<script>alert(1)</script>", kind: "granted", to: 'x"@example.com' });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
  it("writes a preview file for a quick look", () => {
    const { html } = adminEmail({ church: "St. Philopateer Coptic Orthodox Church", kind: "granted", to: "abouna@example.com" });
    fs.mkdirSync("docs/screenshots", { recursive: true });
    fs.writeFileSync("docs/screenshots/admin-email.html", html);
  });
});
