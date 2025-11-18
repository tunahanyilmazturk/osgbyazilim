import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screenings, healthTests, screeningTests } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const screeningId = params.id;

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

    // Check if screening exists
    const screening = await db
      .select()
      .from(screenings)
      .where(eq(screenings.id, parseInt(screeningId)))
      .limit(1);

    if (screening.length === 0) {
      return NextResponse.json(
        {
          error: 'Screening not found',
          code: 'SCREENING_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Get all tests assigned to this screening with full test details
    const assignedTests = await db
      .select({
        assignmentId: screeningTests.id,
        screeningId: screeningTests.screeningId,
        testId: screeningTests.testId,
        assignedAt: screeningTests.createdAt,
        id: healthTests.id,
        name: healthTests.name,
        description: healthTests.description,
        code: healthTests.code,
        isActive: healthTests.isActive,
        createdAt: healthTests.createdAt,
        updatedAt: healthTests.updatedAt,
      })
      .from(screeningTests)
      .innerJoin(healthTests, eq(screeningTests.testId, healthTests.id))
      .where(eq(screeningTests.screeningId, parseInt(screeningId)));

    return NextResponse.json(assignedTests, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const screeningId = params.id;

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

    // Check if screening exists
    const screening = await db
      .select()
      .from(screenings)
      .where(eq(screenings.id, parseInt(screeningId)))
      .limit(1);

    if (screening.length === 0) {
      return NextResponse.json(
        {
          error: 'Screening not found',
          code: 'SCREENING_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { testId, testIds } = body;

    // Validate that either testId or testIds is provided
    if (!testId && !testIds) {
      return NextResponse.json(
        {
          error: 'Either testId or testIds is required',
          code: 'MISSING_REQUIRED_FIELD',
        },
        { status: 400 }
      );
    }

    // Normalize to array for processing
    const testIdsArray = testIds ? testIds : [testId];

    // Validate all test IDs are valid integers
    for (const id of testIdsArray) {
      if (!id || isNaN(parseInt(id.toString()))) {
        return NextResponse.json(
          {
            error: 'Valid test ID is required',
            code: 'INVALID_ID',
          },
          { status: 400 }
        );
      }
    }

    // Check if all tests exist
    for (const id of testIdsArray) {
      const test = await db
        .select()
        .from(healthTests)
        .where(eq(healthTests.id, parseInt(id.toString())))
        .limit(1);

      if (test.length === 0) {
        return NextResponse.json(
          {
            error: `Test with ID ${id} not found`,
            code: 'TEST_NOT_FOUND',
          },
          { status: 404 }
        );
      }
    }

    // Check for duplicate assignments
    for (const id of testIdsArray) {
      const existingAssignment = await db
        .select()
        .from(screeningTests)
        .where(
          and(
            eq(screeningTests.screeningId, parseInt(screeningId)),
            eq(screeningTests.testId, parseInt(id.toString()))
          )
        )
        .limit(1);

      if (existingAssignment.length > 0) {
        return NextResponse.json(
          {
            error: 'Test already assigned to screening',
            code: 'DUPLICATE_ASSIGNMENT',
          },
          { status: 400 }
        );
      }
    }

    // Insert assignments
    const createdAssignments = [];
    const timestamp = new Date().toISOString();

    for (const id of testIdsArray) {
      const assignment = await db
        .insert(screeningTests)
        .values({
          screeningId: parseInt(screeningId),
          testId: parseInt(id.toString()),
          createdAt: timestamp,
        })
        .returning();

      // Get full test details for the response
      const testDetails = await db
        .select({
          assignmentId: screeningTests.id,
          screeningId: screeningTests.screeningId,
          testId: screeningTests.testId,
          assignedAt: screeningTests.createdAt,
          id: healthTests.id,
          name: healthTests.name,
          description: healthTests.description,
          code: healthTests.code,
          isActive: healthTests.isActive,
          createdAt: healthTests.createdAt,
          updatedAt: healthTests.updatedAt,
        })
        .from(screeningTests)
        .innerJoin(healthTests, eq(screeningTests.testId, healthTests.id))
        .where(eq(screeningTests.id, assignment[0].id))
        .limit(1);

      createdAssignments.push(testDetails[0]);
    }

    // Return single object if single testId, array if testIds
    const response = testIds ? createdAssignments : createdAssignments[0];

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}