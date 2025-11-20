import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderToStream } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { QuotePDF } from '@/components/pdf/QuotePDFDocument';
import React from 'react';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(value);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!resend) {
      console.error('RESEND_API_KEY is missing, email sending is disabled.');
      return NextResponse.json(
        { error: 'E-posta servisi bu ortamda yapılandırılmamış (RESEND_API_KEY eksik).' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { to, subject, message } = body;

    // Validation
    if (!to || !subject) {
      return NextResponse.json(
        { error: 'E-posta adresi ve konu gereklidir' },
        { status: 400 }
      );
    }

    // Fetch quote data
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const quoteResponse = await fetch(`${baseUrl}/api/quotes/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!quoteResponse.ok) {
      return NextResponse.json(
        { error: 'Teklif bulunamadı' },
        { status: 404 }
      );
    }

    const quote = await quoteResponse.json();

    // Generate PDF
    const pdfElement = React.createElement(QuotePDF, { quote }) as React.ReactElement<DocumentProps>;
    const stream = await renderToStream(pdfElement);

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as any) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    const defaultMessage = `Merhaba ${quote.company.contactPerson || ''},

Ekte ${quote.quoteNumber} numaralı teklifimizi bilgilerinize sunarız. Sorularınız olursa bizimle iletişime geçebilirsiniz.`;
    const messageHtml = escapeHtml((message?.trim()?.length ? message : defaultMessage).trim())
      .replace(/\n/g, '<br />');

    const quoteUrl = `${baseUrl}/quotes/${quote.id}`;

    // Send email with PDF attachment
    const emailContent = `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f3f4f6;padding:24px 16px;">
        <tr>
          <td>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e7ec;font-family:'Inter',Arial,sans-serif;color:#0f172a;">
              <tr>
                <td style="background:#0f172a;color:#fff;padding:28px 32px;">
                  <div style="font-size:12px;letter-spacing:0.25em;text-transform:uppercase;opacity:0.7;">ÇET-KA OSGB</div>
                  <div style="font-size:24px;font-weight:600;margin-top:8px;">Yeni Teklif</div>
                  <div style="font-size:16px;margin-top:6px;opacity:0.85;">${quote.quoteNumber}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px;">
                  <p style="font-size:15px;line-height:1.7;margin:0;color:#334155;">
                    ${messageHtml}
                  </p>
                  <div style="margin:28px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                    <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:12px;">Özet</div>
                      <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;color:#0f172a;">
                        <tbody>
                          <tr>
                            <td style="padding:0 16px 12px 0;width:50%;vertical-align:top;">
                              <span style="display:block;font-size:12px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Firma</span>
                              <span style="display:block;font-size:16px;font-weight:600;">${quote.company.name}</span>
                            </td>
                            <td style="padding:0 0 12px 16px;width:50%;vertical-align:top;">
                              <span style="display:block;font-size:12px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Yetkili</span>
                              <span style="display:block;font-size:15px;font-weight:500;">${quote.company.contactPerson || '-'}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:0 16px 0 0;width:50%;vertical-align:top;">
                              <span style="display:block;font-size:12px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Teklif Tarihi</span>
                              <span style="display:block;font-size:15px;font-weight:500;">${new Date(quote.issueDate).toLocaleDateString('tr-TR')}</span>
                            </td>
                            <td style="padding:0 0 0 16px;width:50%;vertical-align:top;">
                              <span style="display:block;font-size:12px;color:#94a3b8;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Geçerlilik Tarihi</span>
                              <span style="display:block;font-size:15px;font-weight:500;">${new Date(quote.validUntilDate).toLocaleDateString('tr-TR')}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div style="padding:20px 24px;display:flex;align-items:flex-start;flex-wrap:wrap;gap:12px;">
                      <div>
                        <div style="font-size:13px;color:#94a3b8;">Toplam Tutar</div>
                        <div style="font-size:26px;font-weight:700;color:#0f172a;">${formatCurrency(quote.total)}</div>
                        <div style="font-size:12px;color:#94a3b8;">(KDV Dahil)</div>
                      </div>
                    </div>
                  </div>
                  <p style="font-size:14px;color:#94a3b8;margin:0;">Teklif detaylarının tamamı ekteki PDF dosyasında yer almaktadır.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f8fafc;padding:20px 32px;color:#64748b;font-size:13px;">
                  <p style="margin:0;">Saygılarımızla,<br /><strong>Çet-ka Körfez İş Sağlığı ve Güvenliği</strong></p>
                  <p style="margin:8px 0 0;">Ömerağa Mah. Cemil Karakadılar Cad. No:18/A İzmit Kocaeli<br />Tel: (262) 349 40 83 / 331 69 80</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: to,
      subject: subject,
      html: emailContent,
      attachments: [
        {
          filename: `teklif-${quote.quoteNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      throw new Error(error.message);
    }

    // Update quote status to 'sent' if it was 'draft'
    if (quote.status === 'draft') {
      await fetch(`${baseUrl}/api/quotes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'sent',
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'E-posta başarıyla gönderildi',
      emailId: data?.id ?? null,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'E-posta gönderilirken hata oluştu' },
      { status: 500 }
    );
  }
}