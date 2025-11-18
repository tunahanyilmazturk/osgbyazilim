import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents, companies, screenings } from '@/db/schema';
import { eq, and, lte, gte, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get('days');
    const statusParam = searchParams.get('status') ?? 'active';

    const days = daysParam ? parseInt(daysParam) : 30;
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json({ 
        error: "Days parameter must be between 1 and 365",
        code: "INVALID_DAYS_PARAMETER" 
      }, { status: 400 });
    }

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const nowISO = now.toISOString().split('T')[0];
    const futureDateISO = futureDate.toISOString().split('T')[0];

    const results = await db
      .select({
        id: documents.id,
        title: documents.title,
        description: documents.description,
        fileUrl: documents.fileUrl,
        fileName: documents.fileName,
        fileSize: documents.fileSize,
        fileType: documents.fileType,
        category: documents.category,
        companyId: documents.companyId,
        screeningId: documents.screeningId,
        expiryDate: documents.expiryDate,
        uploadDate: documents.uploadDate,
        uploadedBy: documents.uploadedBy,
        status: documents.status,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        companyName: companies.name,
        screeningDate: screenings.date,
        screeningType: screenings.type,
        screeningParticipant: screenings.participantName,
      })
      .from(documents)
      .leftJoin(companies, eq(documents.companyId, companies.id))
      .leftJoin(screenings, eq(documents.screeningId, screenings.id))
      .where(
        and(
          eq(documents.status, statusParam),
          sql`${documents.expiryDate} IS NOT NULL`,
          lte(documents.expiryDate, futureDateISO)
        )
      )
      .orderBy(sql`${documents.expiryDate} ASC`);

    const processedResults = results.map(doc => {
      const expiryDate = new Date(doc.expiryDate);
      const today = new Date();
      
      const timeDiff = expiryDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      const isExpired = expiryDate < today;

      return {
        id: doc.id,
        title: doc.title,
        description: doc.description,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        category: doc.category,
        companyId: doc.companyId,
        screeningId: doc.screeningId,
        expiryDate: doc.expiryDate,
        uploadDate: doc.uploadDate,
        uploadedBy: doc.uploadedBy,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        company: doc.companyName ? { name: doc.companyName } : null,
        screening: doc.screeningDate ? {
          date: doc.screeningDate,
          type: doc.screeningType,
          participantName: doc.screeningParticipant,
        } : null,
        daysUntilExpiry: daysDiff,
        isExpired: isExpired,
      };
    });

    return NextResponse.json(processedResults);
  } catch (error) {
    console.error('GET /api/documents/expiring error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}