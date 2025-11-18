import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { companyTests, companies, healthTests } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params;

    // Validate companyId is valid integer
    if (!companyId || isNaN(parseInt(companyId))) {
      return NextResponse.json(
        { error: 'Valid company ID is required', code: 'INVALID_COMPANY_ID' },
        { status: 400 }
      );
    }

    const companyIdInt = parseInt(companyId);

    // Verify company exists
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyIdInt))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json(
        { error: 'Company not found', code: 'COMPANY_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { testIds } = body;

    // Validate testIds is an array with at least one element
    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return NextResponse.json(
        { error: 'testIds must be a non-empty array', code: 'INVALID_TEST_IDS' },
        { status: 400 }
      );
    }

    // Validate all testIds are valid integers
    const validTestIds = testIds.every(id => Number.isInteger(id) && id > 0);
    if (!validTestIds) {
      return NextResponse.json(
        { error: 'All test IDs must be valid integers', code: 'INVALID_TEST_ID_FORMAT' },
        { status: 400 }
      );
    }

    // Verify all tests exist using inArray for efficiency
    const tests = await db
      .select()
      .from(healthTests)
      .where(inArray(healthTests.id, testIds));

    if (tests.length !== testIds.length) {
      const foundTestIds = tests.map(t => t.id);
      const missingTestIds = testIds.filter(id => !foundTestIds.includes(id));
      return NextResponse.json(
        { error: `Test(s) not found: ${missingTestIds.join(', ')}`, code: 'TEST_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check for duplicate assignments
    const existingAssignments = await db
      .select()
      .from(companyTests)
      .where(eq(companyTests.companyId, companyIdInt));

    const existingTestIds = existingAssignments.map(assignment => assignment.testId);
    const duplicateTestIds = testIds.filter(id => existingTestIds.includes(id));

    if (duplicateTestIds.length > 0) {
      return NextResponse.json(
        {
          error: `Tests already assigned to company: ${duplicateTestIds.join(', ')}`,
          code: 'DUPLICATE_ASSIGNMENT'
        },
        { status: 400 }
      );
    }

    // Create company_tests records for each testId
    const createdAt = new Date().toISOString();
    const createdAssignments = [];

    for (const testId of testIds) {
      const newAssignment = await db
        .insert(companyTests)
        .values({
          companyId: companyIdInt,
          testId: testId,
          createdAt: createdAt
        })
        .returning();

      // Get test details from already fetched tests
      const testDetails = tests.find(t => t.id === testId);

      createdAssignments.push({
        assignmentId: newAssignment[0].id,
        companyId: newAssignment[0].companyId,
        testId: newAssignment[0].testId,
        assignedAt: newAssignment[0].createdAt,
        test: {
          id: testDetails.id,
          name: testDetails.name,
          description: testDetails.description,
          code: testDetails.code,
          isActive: testDetails.isActive
        }
      });
    }

    return NextResponse.json(createdAssignments, { status: 201 });
  } catch (error) {
    console.error('POST /api/companies/[companyId]/tests error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params;

    // Validate companyId is valid integer
    if (!companyId || isNaN(parseInt(companyId))) {
      return NextResponse.json(
        { error: 'Valid company ID is required', code: 'INVALID_COMPANY_ID' },
        { status: 400 }
      );
    }

    const companyIdInt = parseInt(companyId);

    // Verify company exists
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyIdInt))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json(
        { error: 'Company not found', code: 'COMPANY_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Join company_tests with health_tests table
    const assignments = await db
      .select({
        assignmentId: companyTests.id,
        companyId: companyTests.companyId,
        testId: companyTests.testId,
        assignedAt: companyTests.createdAt,
        id: healthTests.id,
        name: healthTests.name,
        description: healthTests.description,
        code: healthTests.code,
        isActive: healthTests.isActive
      })
      .from(companyTests)
      .innerJoin(healthTests, eq(companyTests.testId, healthTests.id))
      .where(eq(companyTests.companyId, companyIdInt))
      .orderBy(desc(companyTests.createdAt));

    return NextResponse.json(assignments, { status: 200 });
  } catch (error) {
    console.error('GET /api/companies/[companyId]/tests error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}