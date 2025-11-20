import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export type ScreeningNotificationPayload = {
  recipients: string[];
  subject?: string;
  screening: {
    id: number;
    date: string;
    timeStart: string;
    timeEnd: string;
    type: string;
    participantName: string;
    notes?: string | null;
  };
  companyName: string;
  companyContact?: string | null;
  extraMessage?: string;
};

const typeLabels: Record<string, string> = {
  periodic: "Periyodik Muayene",
  initial: "İşe Giriş Muayenesi",
  special: "Özel Muayene",
};

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString("tr-TR", { dateStyle: "long" });
  } catch {
    return value;
  }
};

export async function sendScreeningNotificationEmail(payload: ScreeningNotificationPayload) {
  if (!resend) {
    throw new Error("RESEND_API_KEY tanımlı değil, e-posta gönderilemedi");
  }

  const { recipients, subject: customSubject, screening, companyName, companyContact, extraMessage } = payload;

  if (!recipients || recipients.length === 0) {
    throw new Error("Geçerli alıcı e-posta adresi bulunamadı");
  }

  const subject = customSubject || `Yeni Randevu: ${companyName} - ${formatDate(screening.date)}`;
  const screeningTypeLabel = typeLabels[screening.type] || screening.type;

  const html = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f5f5;padding:24px 0;font-family:'Inter',Arial,sans-serif;">
      <tr>
        <td>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:28px 32px;background:#0f172a;color:#fff;">
                <div style="font-size:13px;letter-spacing:0.2em;text-transform:uppercase;opacity:0.7;">OSGB Yönetimi</div>
                <div style="font-size:22px;font-weight:600;margin-top:10px;">Yeni Randevu Oluşturuldu</div>
                <div style="margin-top:6px;font-size:14px;opacity:0.85;">${companyName}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;color:#0f172a;">
                <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;">
                  Merhaba,
                  <br />
                  ${companyName} firması için yeni bir randevu planlandı. Detaylar aşağıdadır.
                </p>
                <table role="presentation" width="100%" style="border-collapse:separate;border-spacing:0 12px;font-size:14px;">
                  <tr>
                    <td style="width:140px;color:#6b7280;">Randevu Tarihi</td>
                    <td style="font-weight:600;">${formatDate(screening.date)}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;">Saat</td>
                    <td style="font-weight:600;">${screening.timeStart} - ${screening.timeEnd}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;">Randevu Türü</td>
                    <td style="font-weight:600;">${screeningTypeLabel}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;">Katılımcı</td>
                    <td style="font-weight:600;">${screening.participantName}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;">Firma Yetkilisi</td>
                    <td style="font-weight:600;">${companyContact || "-"}</td>
                  </tr>
                </table>
                ${screening.notes ? `<div style="margin-top:16px;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb;"><div style="font-size:13px;color:#6b7280;margin-bottom:6px;">Notlar</div><div style="font-size:14px;white-space:pre-line;color:#1f2937;">${screening.notes}</div></div>` : ""}
                ${extraMessage ? `<div style="margin-top:16px;padding:16px;border-radius:12px;background:#ecfdf5;border:1px solid #bbf7d0;"><div style="font-size:13px;color:#047857;margin-bottom:6px;">Ek Mesaj</div><div style="font-size:14px;white-space:pre-line;color:#065f46;">${extraMessage}</div></div>` : ""}
                <p style="margin-top:24px;font-size:13px;color:#9ca3af;">Bu e-posta otomatik olarak gönderilmiştir.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: recipients,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message || "E-posta gönderimi Resend tarafından reddedildi");
  }
}
