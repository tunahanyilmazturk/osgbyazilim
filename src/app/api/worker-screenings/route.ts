import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workerScreenings, companyWorkers, screenings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const VALID_RESULTS = ['fit', 'conditional', 'unfit', 'pending'];

function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  // Accept both full ISO timestamp and simple YYYY-MM-DD format
  const isoTimestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  const simpleDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return date instanceof Date && !isNaN(date.getTime()) && (isoTimestampRegex.test(dateString) || simpleDateRegex.test(dateString));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workerId, screeningId, result, findings, recommendations, nextScreeningDate } = body;

    // Validate required fields
    if (!workerId) {
      return NextResponse.json(
        { error: 'Worker ID is required', code: 'MISSING_WORKER_ID' },
        { status: 400 }
      );
    }

    if (!screeningId) {
      return NextResponse.json(
        { error: 'Screening ID is required', code: 'MISSING_SCREENING_ID' },
        { status: 400 }
      );
    }

    // Validate workerId is valid integer
    const parsedWorkerId = parseInt(workerId);
    if (isNaN(parsedWorkerId)) {
      return NextResponse.json(
        { error: 'Worker ID must be a valid integer', code: 'INVALID_WORKER_ID' },
        { status: 400 }
      );
    }

    // Validate screeningId is valid integer
    const parsedScreeningId = parseInt(screeningId);
    if (isNaN(parsedScreeningId)) {
      return NextResponse.json(
        { error: 'Screening ID must be a valid integer', code: 'INVALID_SCREENING_ID' },
        { status: 400 }
      );
    }

    // Validate result if provided
    if (result && !VALID_RESULTS.includes(result)) {
      return NextResponse.json(
        { 
          error: `Result must be one of: ${VALID_RESULTS.join(', ')}`, 
          code: 'INVALID_RESULT' 
        },
        { status: 400 }
      );
    }

    // Validate nextScreeningDate if provided
    if (nextScreeningDate && !isValidISODate(nextScreeningDate)) {
      return NextResponse.json(
        { error: 'Next screening date must be a valid ISO date format', code: 'INVALID_DATE_FORMAT' },
        { status: 400 }
      );
    }

    // Check if worker exists
    const worker = await db.select()
      .from(companyWorkers)
      .where(eq(companyWorkers.id, parsedWorkerId))
      .limit(1);

    if (worker.length === 0) {
      return NextResponse.json(
        { error: 'Worker not found', code: 'WORKER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if screening exists
    const screening = await db.select()
      .from(screenings)
      .where(eq(screenings.id, parsedScreeningId))
      .limit(1);

    if (screening.length === 0) {
      return NextResponse.json(
        { error: 'Screening not found', code: 'SCREENING_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check for duplicate entry
    const existingScreening = await db.select()
      .from(workerScreenings)
      .where(
        and(
          eq(workerScreenings.workerId, parsedWorkerId),
          eq(workerScreenings.screeningId, parsedScreeningId)
        )
      )
      .limit(1);

    if (existingScreening.length > 0) {
      return NextResponse.json(
        { 
          error: 'Screening result already exists for this worker', 
          code: 'DUPLICATE_SCREENING_RESULT' 
        },
        { status: 409 }
      );
    }

    // Prepare insert data
    const insertData: any = {
      workerId: parsedWorkerId,
      screeningId: parsedScreeningId,
      createdAt: new Date().toISOString(),
    };

    if (result) {
      insertData.result = result;
    }

    if (findings) {
      insertData.findings = findings.trim();
    }

    if (recommendations) {
      insertData.recommendations = recommendations.trim();
    }

    if (nextScreeningDate) {
      insertData.nextScreeningDate = nextScreeningDate;
    }

    // Insert new worker screening
    const newWorkerScreening = await db.insert(workerScreenings)
      .values(insertData)
      .returning();

    return NextResponse.json(newWorkerScreening[0], { status: 201 });
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const parsedId = parseInt(id);

    // Check if worker screening exists
    const existingScreening = await db.select()
      .from(workerScreenings)
      .where(eq(workerScreenings.id, parsedId))
      .limit(1);

    if (existingScreening.length === 0) {
      return NextResponse.json(
        { error: 'Worker screening not found', code: 'SCREENING_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { result, findings, recommendations, nextScreeningDate } = body;

    // Validate result if provided
    if (result !== undefined && result !== null && !VALID_RESULTS.includes(result)) {
      return NextResponse.json(
        { 
          error: `Result must be one of: ${VALID_RESULTS.join(', ')}`, 
          code: 'INVALID_RESULT' 
        },
        { status: 400 }
      );
    }

    // Validate nextScreeningDate if provided
    if (nextScreeningDate !== undefined && nextScreeningDate !== null && !isValidISODate(nextScreeningDate)) {
      return NextResponse.json(
        { error: 'Next screening date must be a valid ISO date format', code: 'INVALID_DATE_FORMAT' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (result !== undefined) {
      updateData.result = result;
    }

    if (findings !== undefined) {
      updateData.findings = findings ? findings.trim() : findings;
    }

    if (recommendations !== undefined) {
      updateData.recommendations = recommendations ? recommendations.trim() : recommendations;
    }

    if (nextScreeningDate !== undefined) {
      updateData.nextScreeningDate = nextScreeningDate;
    }

    // Only proceed with update if there are fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update', code: 'NO_UPDATE_FIELDS' },
        { status: 400 }
      );
    }

    // Update worker screening
    const updated = await db.update(workerScreenings)
      .set(updateData)
      .where(eq(workerScreenings.id, parsedId))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error: any) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}