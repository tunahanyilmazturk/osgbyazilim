import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderToStream } from '@react-pdf/renderer';
import { QuotePDF } from '@/components/pdf/QuotePDFDocument';
import React from 'react';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
    const stream = await renderToStream(
      React.createElement(QuotePDF, { quote })
    );

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as any) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Send email with PDF attachment
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Fiyat Teklifi</h2>
        <p style="color: #666; line-height: 1.6;">
          ${message || 'Ekte fiyat teklifimiz bulunmaktadır. İnceleyip geri dönüş yapmanızı rica ederiz.'}
        </p>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 5px 0;"><strong>Teklif No:</strong> ${quote.quoteNumber}</p>
          <p style="margin: 5px 0;"><strong>Firma:</strong> ${quote.company.name}</p>
          <p style="margin: 5px 0;"><strong>Toplam Tutar:</strong> ${new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
          }).format(quote.total)}</p>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
          Teklif detayları ekte PDF dosyası olarak bulunmaktadır.
        </p>
        
        <p style="color: #666; line-height: 1.6;">
          Saygılarımızla,<br>
          <strong>Çet-ka Körfez İş Sağlığı ve Güvenliği</strong>
        </p>
      </div>
    `;

    const data = await resend.emails.send({
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
      emailId: data.id,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'E-posta gönderilirken hata oluştu' },
      { status: 500 }
    );
  }
}