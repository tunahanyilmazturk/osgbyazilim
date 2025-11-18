import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { companyTests, healthTests } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string; testId: string } }
) {
  try {
    const { companyId, testId } = params;

    // Validate companyId
    if (!companyId || isNaN(parseInt(companyId))) {
      return NextResponse.json(
        {
          error: 'Valid company ID is required',
          code: 'INVALID_COMPANY_ID',
        },
        { status: 400 }
      );
    }

    // Validate testId
    if (!testId || isNaN(parseInt(testId))) {
      return NextResponse.json(
        {
          error: 'Valid test ID is required',
          code: 'INVALID_TEST_ID',
        },
        { status: 400 }
      );
    }

    const companyIdInt = parseInt(companyId);
    const testIdInt = parseInt(testId);

    // Check if assignment exists
    const existingAssignment = await db
      .select()
      .from(companyTests)
      .where(
        and(
          eq(companyTests.companyId, companyIdInt),
          eq(companyTests.testId, testIdInt)
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

    const assignment = existingAssignment[0];

    // Get test details before deletion
    const testDetails = await db
      .select()
      .from(healthTests)
      .where(eq(healthTests.id, testIdInt))
      .limit(1);

    // Delete the assignment
    const deleted = await db
      .delete(companyTests)
      .where(
        and(
          eq(companyTests.companyId, companyIdInt),
          eq(companyTests.testId, testIdInt)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to remove test from company',
          code: 'DELETE_FAILED',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Test successfully removed from company',
        assignment: {
          assignmentId: assignment.id,
          companyId: assignment.companyId,
          testId: assignment.testId,
          assignedAt: assignment.createdAt,
          test: testDetails.length > 0 ? {
            id: testDetails[0].id,
            name: testDetails[0].name,
            description: testDetails[0].description,
            code: testDetails[0].code,
            isActive: testDetails[0].isActive,
          } : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE company test assignment error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}