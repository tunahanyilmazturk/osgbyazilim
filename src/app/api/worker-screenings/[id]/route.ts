import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workerScreenings, companyWorkers, screenings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Fetch worker screening with related worker and screening data
    const result = await db
      .select({
        id: workerScreenings.id,
        workerId: workerScreenings.workerId,
        screeningId: workerScreenings.screeningId,
        result: workerScreenings.result,
        findings: workerScreenings.findings,
        recommendations: workerScreenings.recommendations,
        nextScreeningDate: workerScreenings.nextScreeningDate,
        createdAt: workerScreenings.createdAt,
        worker: {
          id: companyWorkers.id,
          fullName: companyWorkers.fullName,
          tcNo: companyWorkers.tcNo,
        },
        screening: {
          id: screenings.id,
          date: screenings.date,
          type: screenings.type,
          status: screenings.status,
        },
      })
      .from(workerScreenings)
      .leftJoin(companyWorkers, eq(workerScreenings.workerId, companyWorkers.id))
      .leftJoin(screenings, eq(workerScreenings.screeningId, screenings.id))
      .where(eq(workerScreenings.id, parseInt(id)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { 
          error: 'Worker screening not found',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Check if worker screening exists
    const existing = await db
      .select()
      .from(workerScreenings)
      .where(eq(workerScreenings.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { 
          error: 'Worker screening not found',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Delete the worker screening
    const deleted = await db
      .delete(workerScreenings)
      .where(eq(workerScreenings.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Worker screening deleted successfully',
        deleted: deleted[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}