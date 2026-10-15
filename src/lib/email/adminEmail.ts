// The "you are now an admin" email. Plain tables and inline styles so it looks the same in Gmail, Outlook and phones.
export type AdminEmailKind = "granted" | "invited" | "approved";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amoinee.vercel.app";

const FEATURES: [string, string, string][] = [
  ["📋", "Today", "See who is here, live, and check people in by hand."],
  ["👥", "Members", "Every person in one place, with photos and private notes."],
  ["📊", "Attendance", "Who attends every week and who needs a call."],
  ["🏷️", "Labels", "Called, Visited, Needs prayer, and your own."],
];

export function adminEmail({ church, kind, to }: { church: string; kind: AdminEmailKind; to: string }) {
  const c = esc(church);
  const invited = kind === "invited";
  const title = kind === "approved" ? "Your request was approved" : "You are now an admin";
  const lead =
    kind === "approved"
      ? `An admin approved your request. You can now help look after the people of <b>${c}</b>.`
      : invited
        ? `You were invited to help look after the people of <b>${c}</b>. Your admin access is ready and waits for you.`
        : `You were given admin access to help look after the people of <b>${c}</b>.`;
  const steps = invited
    ? ["Open Amoinee with the button above.", `Choose <b>Create a new profile</b> and sign up with this email (<b>${esc(to)}</b>).`, "That is it. You land on the admin pages straight away."]
    : ["Open Amoinee with the button above.", `Sign in with this email (<b>${esc(to)}</b>).`, "Start from <b>Today</b>, then explore the other pages."];
  const subject = kind === "approved" ? `Your Amoinee request was approved (${church})` : `You are now an admin of ${church} on Amoinee`;

  const feature = (f: [string, string, string]) => `
        <td width="50%" valign="top" style="padding:6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #eadfc4;border-radius:12px;">
            <tr><td style="padding:14px 14px 12px;">
              <div style="font-size:22px;line-height:26px;">${f[0]}</div>
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;color:#7a1f2b;margin-top:4px;">${f[1]}</div>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#5b5446;margin-top:2px;">${f[2]}</div>
            </td></tr>
          </table>
        </td>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#2a0b10;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(title)}: ${c}. Open Amoinee to start.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#2a0b10;">
 <tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-radius:20px;overflow:hidden;background:#fbf7ee;">
   <tr><td align="center" style="background:#7a1f2b;background-image:linear-gradient(135deg,#8a2433,#4a1520);padding:34px 24px 28px;">
     <img src="${SITE}/icon-192.png" width="72" height="72" alt="Amoinee" style="display:block;border:0;border-radius:36px;">
     <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:6px;color:#fbf7ee;margin-top:14px;">AMOINEE</div>
     <div style="font-family:Georgia,serif;font-size:13px;letter-spacing:4px;color:#e6cf8f;margin-top:4px;">ⲁⲙⲱⲓⲛⲓ &nbsp;·&nbsp; COME!</div>
   </td></tr>
   <tr><td style="height:4px;background:#c9a24a;font-size:0;line-height:0;">&nbsp;</td></tr>
   <tr><td style="padding:34px 32px 8px;">
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:3px;color:#8a6420;text-transform:uppercase;">Welcome</div>
     <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:36px;color:#2a0b10;margin-top:8px;">${esc(title)} 🙏</div>
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:25px;color:#3f382c;margin-top:14px;">${lead}</div>
   </td></tr>
   <tr><td style="padding:18px 32px 6px;">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #eadfc4;border-left:5px solid #c9a24a;border-radius:12px;">
      <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:12px;letter-spacing:2px;color:#8a6420;text-transform:uppercase;">Your church</div>
        <div style="font-family:Georgia,serif;font-size:19px;color:#7a1f2b;margin-top:3px;">${c}</div>
        <div style="font-size:12px;letter-spacing:2px;color:#8a6420;text-transform:uppercase;margin-top:12px;">Your role</div>
        <div style="font-size:15px;color:#2a0b10;margin-top:3px;">Admin. You manage this church only.</div>
      </td></tr>
     </table>
   </td></tr>
   <tr><td align="center" style="padding:26px 32px 10px;">
     <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:#7a1f2b;border-radius:12px;">
       <a href="${SITE}/login" style="display:inline-block;padding:15px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#fbf7ee;text-decoration:none;border-radius:12px;border:2px solid #c9a24a;">Open Amoinee</a>
     </td></tr></table>
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7b7261;margin-top:10px;">${SITE.replace(/^https?:\/\//, "")}</div>
   </td></tr>
   <tr><td style="padding:22px 32px 4px;">
     <div style="font-family:Georgia,serif;font-size:20px;color:#2a0b10;">Your first steps</div>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
      ${steps
        .map(
          (s, i) => `<tr><td width="38" valign="top" style="padding:6px 0;"><div style="width:28px;height:28px;border-radius:14px;background:#c9a24a;color:#2a0b10;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;line-height:28px;text-align:center;">${i + 1}</div></td>
      <td valign="top" style="padding:7px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#3f382c;">${s}</td></tr>`,
        )
        .join("")}
     </table>
   </td></tr>
   <tr><td style="padding:22px 26px 6px;">
     <div style="font-family:Georgia,serif;font-size:20px;color:#2a0b10;padding:0 6px 4px;">What you can do</div>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
       <tr>${feature(FEATURES[0])}${feature(FEATURES[1])}</tr>
       <tr>${feature(FEATURES[2])}${feature(FEATURES[3])}</tr>
     </table>
   </td></tr>
   <tr><td style="padding:20px 32px 6px;">
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#5b5446;background:#f4ecd9;border-radius:12px;padding:14px 16px;">
       🔒 <b>Private by design.</b> Notes and labels are visible to admins of your church only, and face data is only kept with a person's consent.
     </div>
   </td></tr>
   <tr><td style="padding:22px 32px 30px;">
     <div style="font-family:Georgia,serif;font-size:16px;line-height:24px;color:#2a0b10;font-style:italic;">&ldquo;Every one of God's people, known and cared for.&rdquo;</div>
   </td></tr>
   <tr><td style="background:#2a0b10;padding:20px 24px;text-align:center;">
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#bfae92;">You received this because an admin of ${c} gave this email address access to Amoinee.<br>Not expecting it? You can simply ignore this email.</div>
     <div style="font-family:Georgia,serif;font-size:12px;letter-spacing:3px;color:#c9a24a;margin-top:10px;">AMOINEE</div>
   </td></tr>
  </table>
 </td></tr>
</table>
</body></html>`;
  // emoji and other special characters become plain ASCII codes, so no mail system can garble them
  const safe = html.replace(/[^ -]/gu, (ch) => `&#${ch.codePointAt(0)};`);
  return { subject, html: safe };
}
