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
  if (!transporter) {
    throw new Error("لم يتم ضبط إعدادات خادم البريد (SMTP Username/Password missing)");
  }

  const senderUser = config?.smtpUser || process.env.SMTP_USER;
  try {
    await transporter.sendMail({
      from: `"IMAMU App" <${senderUser}>`,
      to: email,
      subject: "Your Verification Code - رمز التحقق الخاص بك",
      text: `Your verification code is: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 500px;">
          <h2 style="color: #2563eb; margin-top: 0;">رمز التحقق الخاص بك 🔑</h2>
          <p style="font-size: 14px; color: #334155;">استخدم الرمز التالي لتأكيد حسابك في دليل جامعة الإمام:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e293b; background: #ffffff; padding: 12px 24px; display: inline-block; border-radius: 8px; border: 1px solid #cbd5e1; margin: 10px 0;">
            ${code}
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">صلاحية هذا الرمز 10 دقائق فقط.</p>
        </div>
      `,
    });
    return true;
  } catch (err: any) {
    if (err?.message?.includes('535') || err?.message?.includes('authentication failed')) {
      throw new Error("خطأ في مصادقة SMTP (535): اسم المستخدم أو كلمة مرور التطبيقات (App Password) غير صحيحة.");
    }
    throw err;
  }
}

export async function sendCustomEmail(
  to: string, 
  subject: string, 
  body: string, 
  config?: SmtpConfig
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = createMailerTransporter(config);
    if (!transporter) {
      return { success: false, error: "SMTP settings not configured (Missing user or password)" };
    }

    const senderUser = config?.smtpUser || process.env.SMTP_USER;
    const info = await transporter.sendMail({
      from: `"IMAMU Helper" <${senderUser}>`,
      to,
      subject: subject || "رسالة تجريبية من دليل الإمام",
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 24px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; margin-top: 0;">دليل جامعة الإمام - رسالة تجريبية 📧</h2>
          <div style="font-size: 14px; color: #334155; background: #ffffff; padding: 16px; border-radius: 12px; border: 1px solid #cbd5e1; margin-bottom: 16px;">
            ${body.replace(/\n/g, '<br/>')}
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">تم إرسال هذه الرسالة لاختبار إعدادات البريد الإلكتروني (SMTP).</p>
        </div>
      `
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[Mailer Error]", err);
    return { success: false, error: err.message || "Failed to send email" };
  }
}
