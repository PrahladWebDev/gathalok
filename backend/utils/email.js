const nodemailer = require('nodemailer');

// ─── Transporter ────────────────────────────────────────────
// Reads SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS from env.
// Port 465 -> implicit TLS ("secure"); anything else (e.g. 587) -> STARTTLS.
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP is not fully configured (SMTP_HOST/SMTP_USER/SMTP_PASS). Emails will fail to send.');
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const FROM_NAME = process.env.SMTP_FROM_NAME || 'GathaLok';

// ─── Shared email shell (matches the GathaLok brand) ────────
const wrapTemplate = ({ preheader, heading, bodyHtml, ctaText, ctaUrl, footerNote }) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#0D0A1A;font-family:Georgia,'Times New Roman',serif;">
  <span style="display:none;font-size:1px;color:#0D0A1A;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0A1A;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#161028;border:1px solid rgba(183,140,62,0.3);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#8B1A1A,#B78C3E,#D4660A);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;text-align:center;">
              <span style="font-size:22px;color:#B78C3E;">॥</span>
              <span style="font-size:20px;font-weight:700;color:#F0EAD6;letter-spacing:0.5px;">&nbsp;GathaLok</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0 32px;text-align:center;">
              <h1 style="margin:0 0 12px 0;font-size:22px;color:#F0EAD6;font-weight:600;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px 32px;color:#C8C0A8;font-size:15px;line-height:1.7;text-align:center;">
              ${bodyHtml}
            </td>
          </tr>
          ${ctaUrl ? `
          <tr>
            <td style="padding:0 32px 28px 32px;text-align:center;">
              <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#D4A84B,#B78C3E);color:#0D0A1A;text-decoration:none;font-weight:700;font-size:15px;padding:12px 32px;border-radius:8px;font-family:Arial,sans-serif;">${ctaText}</a>
              <p style="margin:16px 0 0 0;font-size:12px;color:#7A7090;word-break:break-all;">Or paste this link into your browser:<br /><a href="${ctaUrl}" style="color:#D4A84B;">${ctaUrl}</a></p>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding:20px 32px 28px 32px;border-top:1px solid rgba(183,140,62,0.15);text-align:center;">
              <p style="margin:0;font-size:12px;color:#7A7090;line-height:1.6;">${footerNote || ''}</p>
              <p style="margin:8px 0 0 0;font-size:12px;color:#7A7090;">— The GathaLok Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const send = async ({ to, subject, html, text }) => {
  const from = `"${FROM_NAME}" <${process.env.SMTP_USER}>`;
  await getTransporter().sendMail({ from, to, subject, html, text });
};

// ─── Verification email ──────────────────────────────────────
exports.sendVerificationEmail = async (user, rawToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${rawToken}`;
  const html = wrapTemplate({
    preheader: 'Verify your email to start exploring GathaLok.',
    heading: 'Verify Your Email',
    bodyHtml: `Namaste ${user.name || ''},<br /><br />Welcome to GathaLok! Please confirm this is your email address to activate your account. This link expires in 24 hours.`,
    ctaText: 'Verify Email',
    ctaUrl: verifyUrl,
    footerNote: "If you didn't create a GathaLok account, you can safely ignore this email.",
  });
  await send({
    to: user.email,
    subject: 'Verify your GathaLok account',
    html,
    text: `Verify your GathaLok account: ${verifyUrl} (expires in 24 hours)`,
  });
};

// ─── Password reset email ─────────────────────────────────────
exports.sendResetPasswordEmail = async (user, rawToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${rawToken}`;
  const html = wrapTemplate({
    preheader: 'Reset your GathaLok password.',
    heading: 'Reset Your Password',
    bodyHtml: `Namaste ${user.name || ''},<br /><br />We received a request to reset your GathaLok password. This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password will remain unchanged.`,
    ctaText: 'Reset Password',
    ctaUrl: resetUrl,
    footerNote: "For your security, this link can only be used once.",
  });
  await send({
    to: user.email,
    subject: 'Reset your GathaLok password',
    html,
    text: `Reset your GathaLok password: ${resetUrl} (expires in 1 hour)`,
  });
};
