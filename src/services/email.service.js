import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

const getEmailConfig = () => {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`Email service is not configured. Missing: ${missing.join(', ')}`);
  }

  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be a valid port number.');
  }

  return {
    host: process.env.SMTP_HOST.trim(),
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    from: process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER,
  };
};

export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("SMTP connection successful!");
  } catch (error) {
    console.error("SMTP connection failed:", error.message);
  }
};

export const sendEmailConfirmation = async ({ email, name, token }) => {
  const config = getEmailConfig();
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const apiBaseUrl = (process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`)
    .trim().replace(/\/$/, '');
  const confirmationUrl = `${apiBaseUrl}/api/v1/auth/confirm-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: config.from,
    to: email,
    subject: 'Confirm your Job Application Tracker email',
    text: `Hello ${name},\n\nConfirm your email address by opening this link within 24 hours:\n${confirmationUrl}\n\nIf you did not create this account, you can ignore this message.`,
    html: `<p>Hello ${escapeHtml(name)},</p><p>Confirm your email address by opening the link below within 24 hours:</p><p><a href="${confirmationUrl}">Confirm my email</a></p><p>If you did not create this account, you can ignore this message.</p>`,
  });
};

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
