import { NextRequest, NextResponse } from 'next/server';
import { renderToStream, type DocumentProps } from '@react-pdf/renderer';
import { QuotePDF, type QuoteCompanyInfo } from '@/components/pdf/QuotePDFDocument';
import { createElement, type ReactElement } from 'react';

async function generatePdfResponse(id: string, companyInfo?: QuoteCompanyInfo) {
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

  const pdfElement = createElement(QuotePDF, {
    quote,
    companyInfo,
  }) as ReactElement<DocumentProps>;

  const stream = await renderToStream(pdfElement);

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as any) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="teklif-${quote.quoteNumber}.pdf"`,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let companyInfo: QuoteCompanyInfo | undefined;

    const companyInfoParam = request.nextUrl.searchParams.get('companyInfo');
    if (companyInfoParam) {
      try {
        companyInfo = JSON.parse(decodeURIComponent(companyInfoParam));
      } catch (e) {
        console.error('Error parsing companyInfo:', e);
      }
    }

    return await generatePdfResponse(id, companyInfo);
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'PDF oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let companyInfo: QuoteCompanyInfo | undefined;

    try {
      const body = await request.json();
      if (body?.companyInfo) {
        companyInfo = body.companyInfo as QuoteCompanyInfo;
      }
    } catch (e) {
      console.error('Error parsing companyInfo from body:', e);
    }

    return await generatePdfResponse(id, companyInfo);
  } catch (error) {
    console.error('Error generating PDF (POST):', error);
    return NextResponse.json(
      { error: 'PDF oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
