import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { companyWorkers, workerScreenings, screenings, documents } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string; workerId: string } }
) {
  try {
    const { companyId, workerId } = params;

    // Validate companyId
    if (!companyId || isNaN(parseInt(companyId))) {
      return NextResponse.json(
        { error: 'Valid company ID is required', code: 'INVALID_COMPANY_ID' },
        { status: 400 }
      );
    }

    // Validate workerId
    if (!workerId || isNaN(parseInt(workerId))) {
      return NextResponse.json(
        { error: 'Valid worker ID is required', code: 'INVALID_WORKER_ID' },
        { status: 400 }
      );
    }

    const companyIdInt = parseInt(companyId);
    const workerIdInt = parseInt(workerId);

    // Step 1: Verify worker exists and belongs to the specified company
    const worker = await db
      .select()
      .from(companyWorkers)
      .where(
        and(
          eq(companyWorkers.id, workerIdInt),
          eq(companyWorkers.companyId, companyIdInt)
        )
      )
      .limit(1);

    if (worker.length === 0) {
      return NextResponse.json(
        { error: 'Worker not found or does not belong to this company', code: 'WORKER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Step 2: Get all worker screenings with joined screening details
    const workerScreeningRecords = await db
      .select({
        // Worker screening fields
        workerScreeningId: workerScreenings.id,
        result: workerScreenings.result,
        findings: workerScreenings.findings,
        recommendations: workerScreenings.recommendations,
        nextScreeningDate: workerScreenings.nextScreeningDate,
        recordedAt: workerScreenings.createdAt,
        // Screening fields
        screeningId: screenings.id,
        date: screenings.date,
        timeStart: screenings.timeStart,
        timeEnd: screenings.timeEnd,
        type: screenings.type,
        status: screenings.status,
        notes: screenings.notes,
        participantName: screenings.participantName,
      })
      .from(workerScreenings)
      .innerJoin(screenings, eq(workerScreenings.screeningId, screenings.id))
      .where(eq(workerScreenings.workerId, workerIdInt))
      .orderBy(desc(screenings.date));

    // If no screening records found, return empty array
    if (workerScreeningRecords.length === 0) {
      return NextResponse.json([]);
    }

    // Step 3: Get all screening IDs to fetch related documents
    const screeningIds = workerScreeningRecords.map(record => record.screeningId);

    // Fetch all documents for these screenings
    const allDocuments = await db
      .select({
        id: documents.id,
        screeningId: documents.screeningId,
        fileName: documents.fileName,
        fileUrl: documents.fileUrl,
        fileSize: documents.fileSize,
        fileType: documents.fileType,
        uploadedAt: documents.uploadedAt,
        notes: documents.notes,
      })
      .from(documents)
      .where(
        screeningIds.length === 1
          ? eq(documents.screeningId, screeningIds[0])
          : and(...screeningIds.map(id => eq(documents.screeningId, id)))
      );

    // Step 4: Group documents by screeningId
    const documentsByScreening: Record<number, typeof allDocuments> = {};
    allDocuments.forEach(doc => {
      if (!documentsByScreening[doc.screeningId]) {
        documentsByScreening[doc.screeningId] = [];
      }
      documentsByScreening[doc.screeningId].push(doc);
    });

    // Step 5: Combine all data into comprehensive response
    const healthHistory = workerScreeningRecords.map(record => ({
      workerScreeningId: record.workerScreeningId,
      result: record.result,
      findings: record.findings,
      recommendations: record.recommendations,
      nextScreeningDate: record.nextScreeningDate,
      recordedAt: record.recordedAt,
      screening: {
        screeningId: record.screeningId,
        date: record.date,
        timeStart: record.timeStart,
        timeEnd: record.timeEnd,
        type: record.type,
        status: record.status,
        notes: record.notes,
        participantName: record.participantName,
      },
      documents: (documentsByScreening[record.screeningId] || []).map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        uploadedAt: doc.uploadedAt,
        notes: doc.notes,
      })),
    }));

    return NextResponse.json(healthHistory);
  } catch (error) {
    console.error('GET health history error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}