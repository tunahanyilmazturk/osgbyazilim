import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { db } from '@/db';
import { screenings, companies, users, screeningUsers, healthTests, screeningTests } from '@/db/schema';
import { eq } from 'drizzle-orm';
import ScreeningPDF from '@/components/pdf/ScreeningPDF';
import React from 'react';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const screeningId = parseInt(id);

    if (isNaN(screeningId)) {
      return NextResponse.json({ error: 'Invalid screening ID' }, { status: 400 });
    }

    // Fetch screening
    const [screening] = await db
      .select()
      .from(screenings)
      .where(eq(screenings.id, screeningId))
      .limit(1);

    if (!screening) {
      return NextResponse.json({ error: 'Screening not found' }, { status: 404 });
    }

    // Fetch company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, screening.companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Fetch assigned users
    const assignedUsersData = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phone: users.phone,
        department: users.department,
      })
      .from(screeningUsers)
      .innerJoin(users, eq(screeningUsers.userId, users.id))
      .where(eq(screeningUsers.screeningId, screeningId));

    // Fetch assigned tests
    const assignedTestsData = await db
      .select({
        id: healthTests.id,
        name: healthTests.name,
        code: healthTests.code,
      })
      .from(screeningTests)
      .innerJoin(healthTests, eq(screeningTests.testId, healthTests.id))
      .where(eq(screeningTests.screeningId, screeningId));

    // Get company info with stamp from query params
    const searchParams = request.nextUrl.searchParams;
    const companyInfoParam = searchParams.get('companyInfo');
    let companyInfo = undefined;
    
    if (companyInfoParam) {
      try {
        companyInfo = JSON.parse(decodeURIComponent(companyInfoParam));
      } catch (e) {
        console.error('Error parsing companyInfo:', e);
      }
    }

    // Prepare clean data object
    const pdfProps = {
      screening: {
        id: screening.id,
        date: screening.date,
        timeStart: screening.timeStart,
        timeEnd: screening.timeEnd,
        participantName: screening.participantName,
        employeeCount: screening.employeeCount,
        type: screening.type as 'periodic' | 'initial' | 'special',
        status: screening.status as 'scheduled' | 'completed' | 'cancelled' | 'no-show',
        notes: screening.notes,
        createdAt: typeof screening.createdAt === 'string' ? screening.createdAt : new Date(screening.createdAt).toISOString(),
        assignedUsers: assignedUsersData,
        assignedTests: assignedTestsData,
      },
      company: {
        name: company.name,
        contactPerson: company.contactPerson,
        phone: company.phone,
        email: company.email,
        address: company.address,
      },
      companyInfo,
    };

    // Generate PDF using React.createElement
    const pdfElement = React.createElement(ScreeningPDF, pdfProps);
    const stream = await renderToStream(pdfElement);

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Return PDF
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="randevu-${screening.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}