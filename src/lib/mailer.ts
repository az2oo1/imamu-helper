import nodemailer from 'nodemailer';

export interface SmtpConfig {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
}

export function createMailerTransporter(config?: SmtpConfig) {
  const host = config?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(config?.smtpPort || process.env.SMTP_PORT) || 587;
  const user = config?.smtpUser || process.env.SMTP_USER;
  const pass = config?.smtpPass || process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
    auth: { user, pass },
  } as any);
}

export async function sendVerificationEmail(email: string, code: string, config?: SmtpConfig): Promise<boolean> {
  const transporter = createMailerTransporter(config);
  if (!transporter) return false;

  const senderUser = config?.smtpUser || process.env.SMTP_USER;
  await transporter.sendMail({
    from: `"IMAMU App" <${senderUser}>`,
    to: email,
    subject: "Your Verification Code - رمز التحقق الخاص بك",
    text: `Your verification code is: ${code}`,
    html: `<b>Your verification code is: ${code}</b>`,
  });

  return true;
}
