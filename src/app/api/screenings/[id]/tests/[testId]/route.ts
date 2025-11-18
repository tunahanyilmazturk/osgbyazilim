import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screeningTests, healthTests } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; testId: string } }
) {
  try {
    const screeningId = params.id;
    const testId = params.testId;

    // Validate screening ID
    if (!screeningId || isNaN(parseInt(screeningId))) {
      return NextResponse.json(
        {
          error: 'Valid screening ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    // Validate test ID
    if (!testId || isNaN(parseInt(testId))) {
      return NextResponse.json(
        {
          error: 'Valid test ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const parsedScreeningId = parseInt(screeningId);
    const parsedTestId = parseInt(testId);

    // Check if assignment exists
    const existingAssignment = await db
      .select()
      .from(screeningTests)
      .where(
        and(
          eq(screeningTests.screeningId, parsedScreeningId),
          eq(screeningTests.testId, parsedTestId)
        )
      )
      .limit(1);

    if (existingAssignment.length === 0) {
      return NextResponse.json(
        {
          error: 'Test assignment not found',
          code: 'ASSIGNMENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Get test details before deletion
    const testDetails = await db
      .select()
      .from(healthTests)
      .where(eq(healthTests.id, parsedTestId))
      .limit(1);

    // Delete the assignment
    const deleted = await db
      .delete(screeningTests)
      .where(
        and(
          eq(screeningTests.screeningId, parsedScreeningId),
          eq(screeningTests.testId, parsedTestId)
        )
      )
      .returning();

    return NextResponse.json(
      {
        message: 'Test successfully removed from screening',
        assignment: {
          assignmentId: deleted[0].id,
          screeningId: deleted[0].screeningId,
          testId: deleted[0].testId,
          assignedAt: deleted[0].createdAt,
          test: testDetails.length > 0 ? {
            id: testDetails[0].id,
            name: testDetails[0].name,
            description: testDetails[0].description,
            code: testDetails[0].code,
            isActive: testDetails[0].isActive,
            createdAt: testDetails[0].createdAt,
            updatedAt: testDetails[0].updatedAt,
          } : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}