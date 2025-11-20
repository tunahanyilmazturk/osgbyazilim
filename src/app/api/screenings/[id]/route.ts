import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screenings, screeningUsers, users, companies, screeningTests, healthTests, companyWorkers } from '@/db/schema';
import { eq } from 'drizzle-orm';

const VALID_TYPES = ['periodic', 'initial', 'special'];
const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'no-show'];

// GET single screening by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const screening = await db
      .select()
      .from(screenings)
      .where(eq(screenings.id, parseInt(id)))
      .limit(1);

    if (screening.length === 0) {
      return NextResponse.json(
        { error: 'Screening not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Fetch assigned users for this screening
    const assignedUsers = await db
      .select({
        id: screeningUsers.id,
        screeningId: screeningUsers.screeningId,
        userId: screeningUsers.userId,
        assignedAt: screeningUsers.assignedAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          phone: users.phone,
          department: users.department,
        },
      })
      .from(screeningUsers)
      .innerJoin(users, eq(screeningUsers.userId, users.id))
      .where(eq(screeningUsers.screeningId, parseInt(id)));

    // Fetch assigned tests for this screening
    const assignedTests = await db
      .select({
        assignmentId: screeningTests.id,
        testId: healthTests.id,
        name: healthTests.name,
        code: healthTests.code,
        assignedAt: screeningTests.createdAt,
      })
      .from(screeningTests)
      .innerJoin(healthTests, eq(screeningTests.testId, healthTests.id))
      .where(eq(screeningTests.screeningId, parseInt(id)));

    // Fetch company workers (personnel) for this screening's company
    const companyPersonnel = await db
      .select({
        id: companyWorkers.id,
        fullName: companyWorkers.fullName,
        email: companyWorkers.email,
        phone: companyWorkers.phone,
        jobTitle: companyWorkers.jobTitle,
        department: companyWorkers.department,
        isActive: companyWorkers.isActive,
      })
      .from(companyWorkers)
      .where(eq(companyWorkers.companyId, screening[0].companyId));

    return NextResponse.json(
      {
        ...screening[0],
        assignedUsers: assignedUsers.map((au) => ({
          assignmentId: au.id,
          assignedAt: au.assignedAt,
          ...au.user,
        })),
        assignedTests: assignedTests.map((at) => ({
          assignmentId: at.assignmentId,
          assignedAt: at.assignedAt,
          id: at.testId,
          name: at.name,
          code: at.code,
        })),
        companyWorkers: companyPersonnel,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// PATCH - Update screening (partial update)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { companyId, participantName, date, timeStart, timeEnd, employeeCount, type, status, notes } = body;

    // Check if screening exists
    const existing = await db
      .select()
      .from(screenings)
      .where(eq(screenings.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Screening not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        {
          error: `Type must be one of: ${VALID_TYPES.join(', ')}`,
          code: 'INVALID_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    // Validate companyId if provided
    if (companyId !== undefined && isNaN(parseInt(companyId))) {
      return NextResponse.json(
        { error: 'Company ID must be a valid number', code: 'INVALID_COMPANY_ID' },
        { status: 400 }
      );
    }

    // Verify company exists if companyId is being updated
    if (companyId !== undefined) {
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, parseInt(companyId)))
        .limit(1);

      if (company.length === 0) {
        return NextResponse.json(
          { error: 'Company not found', code: 'COMPANY_NOT_FOUND' },
          { status: 404 }
        );
      }
    }

    // Validate employeeCount if provided
    if (employeeCount !== undefined && isNaN(parseInt(employeeCount))) {
      return NextResponse.json(
        { error: 'Employee count must be a valid number', code: 'INVALID_EMPLOYEE_COUNT' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = {};

    if (companyId !== undefined) updates.companyId = parseInt(companyId);
    if (participantName !== undefined && participantName !== null) {
      updates.participantName = String(participantName).trim();
    }
    if (date !== undefined) updates.date = date;
    if (timeStart !== undefined) updates.timeStart = timeStart;
    if (timeEnd !== undefined) updates.timeEnd = timeEnd;
    if (employeeCount !== undefined) updates.employeeCount = parseInt(employeeCount);
    if (type !== undefined) updates.type = type;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    // Update screening
    const updated = await db
      .update(screenings)
      .set(updates)
      .where(eq(screenings.id, parseInt(id)))
      .returning();

    // Fetch assigned users for response
    const assignedUsers = await db
      .select({
        id: screeningUsers.id,
        screeningId: screeningUsers.screeningId,
        userId: screeningUsers.userId,
        assignedAt: screeningUsers.assignedAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          phone: users.phone,
          department: users.department,
        },
      })
      .from(screeningUsers)
      .innerJoin(users, eq(screeningUsers.userId, users.id))
      .where(eq(screeningUsers.screeningId, parseInt(id)));

    return NextResponse.json(
      {
        ...updated[0],
        assignedUsers: assignedUsers.map((au) => ({
          assignmentId: au.id,
          assignedAt: au.assignedAt,
          ...au.user,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE screening
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if screening exists
    const existing = await db
      .select()
      .from(screenings)
      .where(eq(screenings.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Screening not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete screening (cascade will handle screening_users)
    const deleted = await db
      .delete(screenings)
      .where(eq(screenings.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Screening deleted successfully',
        screening: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}