/* Amoinee approval mailer (Google Apps Script).
   MUST be created and authorized under heavenlyvisions25@gmail.com.
   The app posts {token, to, subject, html}; this sends it from that Gmail account.
   Deploy as Web app: Execute as Me, Who has access: Anyone.
   Replace TOKEN below with the same value as MAILER_TOKEN in Vercel. Never commit the real token. */
var TOKEN = 'PASTE_TOKEN_HERE';
var ALLOWED_TO = 'heavenlyvisions25@gmail.com';

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  if (body.token !== TOKEN || body.to !== ALLOWED_TO) {
    return ContentService.createTextOutput('denied');
  }
  GmailApp.sendEmail(body.to, body.subject, 'Open this email in an HTML viewer.', { htmlBody: body.html, name: 'Amoinee' });
  return ContentService.createTextOutput('ok');
}
