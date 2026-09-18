const nodemailer = require('nodemailer');

const RESTAURANT_NAME = 'Maison du Rivage';

let transporter = null;
let warnedMissingConfig = false;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function detailRow(label, value) {
  return `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #E7DFD3;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8A8072;">${label}</td>
    <td style="padding:12px 0;border-bottom:1px solid #E7DFD3;font-size:15px;color:#2E2A25;text-align:right;font-weight:bold;">${escapeHtml(value)}</td>
  </tr>`;
}

function renderConfirmationHtml(r) {
  return `<!DOCTYPE html>
<html lang="ro">
<body style="margin:0;padding:0;background:#FBF8F3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#FFFFFF;border:1px solid #E7DFD3;border-radius:10px;overflow:hidden;font-family:Georgia,'Times New Roman',serif;color:#2E2A25;">
        <tr><td style="padding:40px 40px 8px;text-align:center;">
          <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8A8072;">Restaurant &middot; Fine dining</p>
          <h1 style="margin:0;font-size:30px;font-weight:normal;">${RESTAURANT_NAME}</h1>
        </td></tr>
        <tr><td style="padding:24px 40px 0;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Dragă ${escapeHtml(r.name)},</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">Îți mulțumim că ai ales să ne fii oaspete. Rezervarea ta este confirmată, iar echipa noastră se pregătește să te primească într-un cadru gândit până la cel mai mic detaliu.</p>
        </td></tr>
        <tr><td style="padding:0 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E7DFD3;font-family:Arial,sans-serif;">
            ${detailRow('Cod rezervare', r.code)}
            ${detailRow('Nume', r.name)}
            ${detailRow('Data', r.date)}
            ${detailRow('Ora', r.time)}
            ${detailRow('Zona', r.zoneName)}
            ${detailRow('Număr de persoane', r.partySize)}
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px 40px;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#8A8072;">Păstrează codul de rezervare: îți permite să îți vizualizezi sau să îți anulezi rezervarea oricând. Te așteptăm cu drag.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Se apeleaza dupa COMMIT-ul tranzactiei de creare a rezervarii. Daca SMTP nu e
// configurat sau trimiterea esueaza, rezervarea ramane valida (eroarea e doar logata).
async function sendConfirmationEmail(reservation) {
  if (!isConfigured()) {
    if (!warnedMissingConfig) {
      console.warn('SMTP neconfigurat in .env: e-mailul de confirmare nu a fost trimis.');
      warnedMissingConfig = true;
    }
    return null;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  return getTransporter().sendMail({
    from: `${RESTAURANT_NAME} <${from}>`,
    to: reservation.email,
    subject: `Confirmarea rezervării tale — ${RESTAURANT_NAME}`,
    html: renderConfirmationHtml(reservation),
  });
}

module.exports = { sendConfirmationEmail };
