import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screenings, notifications, companies, screeningUsers, users, screeningTests, healthTests } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

const VALID_TYPES = ['periodic', 'initial', 'special'];
const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'no-show'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single screening by ID
    if (id) {
      if (isNaN(parseInt(id))) {
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
        },
        { status: 200 }
      );
    }

    // List screenings with filters and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const date = searchParams.get('date');

    let query = db.select().from(screenings);

    // Build filter conditions
    const conditions = [];

    if (companyId) {
      conditions.push(eq(screenings.companyId, parseInt(companyId)));
    }

    if (status) {
      conditions.push(eq(screenings.status, status));
    }

    if (type) {
      conditions.push(eq(screenings.type, type));
    }

    if (date) {
      conditions.push(eq(screenings.date, date));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.limit(limit).offset(offset);

    // Fetch assigned users and tests for each screening
    const screeningsWithDetails = await Promise.all(
      results.map(async (screening) => {
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
          .where(eq(screeningUsers.screeningId, screening.id));

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
          .where(eq(screeningTests.screeningId, screening.id));

        return {
          ...screening,
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
        };
      })
    );

    return NextResponse.json(screeningsWithDetails, { status: 200 });
  } catch (error) {
    logger.apiError('/api/screenings', error, 500);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, participantName, date, timeStart, timeEnd, employeeCount, type, notes, userIds } = body;

    // Validate required fields
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required', code: 'MISSING_COMPANY_ID' },
        { status: 400 }
      );
    }

    if (!participantName || participantName.trim() === '') {
      return NextResponse.json(
        { error: 'Participant name is required', code: 'MISSING_PARTICIPANT_NAME' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required', code: 'MISSING_DATE' },
        { status: 400 }
      );
    }

    if (!timeStart) {
      return NextResponse.json(
        { error: 'Time start is required', code: 'MISSING_TIME_START' },
        { status: 400 }
      );
    }

    if (!timeEnd) {
      return NextResponse.json(
        { error: 'Time end is required', code: 'MISSING_TIME_END' },
        { status: 400 }
      );
    }

    if (employeeCount === undefined || employeeCount === null) {
      return NextResponse.json(
        { error: 'Employee count is required', code: 'MISSING_EMPLOYEE_COUNT' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Type is required', code: 'MISSING_TYPE' },
        { status: 400 }
      );
    }

    // Validate type
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        {
          error: `Type must be one of: ${VALID_TYPES.join(', ')}`,
          code: 'INVALID_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate companyId is a number
    if (isNaN(parseInt(companyId))) {
      return NextResponse.json(
        { error: 'Company ID must be a valid number', code: 'INVALID_COMPANY_ID' },
        { status: 400 }
      );
    }

    // Validate employeeCount is a number
    if (isNaN(parseInt(employeeCount))) {
      return NextResponse.json(
        { error: 'Employee count must be a valid number', code: 'INVALID_EMPLOYEE_COUNT' },
        { status: 400 }
      );
    }

    // Validate userIds if provided
    if (userIds !== undefined && userIds !== null) {
      if (!Array.isArray(userIds)) {
        return NextResponse.json(
          { error: 'User IDs must be an array', code: 'INVALID_USER_IDS' },
          { status: 400 }
        );
      }

      // Validate each user ID is a valid integer
      for (const uid of userIds) {
        if (isNaN(parseInt(uid))) {
          return NextResponse.json(
            { error: 'All user IDs must be valid numbers', code: 'INVALID_USER_ID' },
            { status: 400 }
          );
        }

        // Verify user exists and is active
        const userExists = await db
          .select()
          .from(users)
          .where(eq(users.id, parseInt(uid)))
          .limit(1);

        if (userExists.length === 0) {
          return NextResponse.json(
            { error: `User with ID ${uid} not found`, code: 'USER_NOT_FOUND' },
            { status: 404 }
          );
        }

        if (!userExists[0].isActive) {
          return NextResponse.json(
            { error: `User with ID ${uid} is not active`, code: 'USER_INACTIVE' },
            { status: 400 }
          );
        }
      }
    }

    // Verify company exists
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

    // Create new screening
    const newScreening = await db
      .insert(screenings)
      .values({
        companyId: parseInt(companyId),
        participantName: participantName.trim(),
        date,
        timeStart,
        timeEnd,
        employeeCount: parseInt(employeeCount),
        type,
        status: 'scheduled',
        notes: notes || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    // Create screening-user assignments if userIds provided
    const assignedUsers = [];
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const assignmentTimestamp = new Date().toISOString();
      
      for (const uid of userIds) {
        const assignment = await db
          .insert(screeningUsers)
          .values({
            screeningId: newScreening[0].id,
            userId: parseInt(uid),
            assignedAt: assignmentTimestamp,
          })
          .returning();

        // Fetch user details
        const userDetails = await db
          .select()
          .from(users)
          .where(eq(users.id, parseInt(uid)))
          .limit(1);

        assignedUsers.push({
          assignmentId: assignment[0].id,
          assignedAt: assignment[0].assignedAt,
          ...userDetails[0],
        });
      }
    }

    // Create notification for the new screening
    try {
      const typeLabels: Record<string, string> = {
        periodic: 'Periyodik Muayene',
        initial: 'İşe Giriş Muayenesi',
        special: 'Özel Muayene',
      };

      await db.insert(notifications).values({
        type: 'screening_scheduled',
        title: 'Yeni Randevu Oluşturuldu',
        message: `${participantName.trim()} (${company[0].name}) için ${typeLabels[type]} randevusu oluşturuldu. Tarih: ${date}, Saat: ${timeStart} - ${timeEnd}`,
        screeningId: newScreening[0].id,
        isRead: false,
        createdAt: new Date().toISOString(),
        scheduledFor: `${date}T${timeStart}:00`,
      });
    } catch (notifError) {
      logger.error('Error creating notification', notifError);
      // Don't fail the screening creation if notification fails
    }

    return NextResponse.json(
      {
        ...newScreening[0],
        assignedUsers,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.apiError('/api/screenings', error, 500);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { companyId, participantName, participantJobTitle, date, time, type, status, notes } = body;

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

    // Build update object with only provided fields
    const updates: Record<string, string | number | null> = {};

    if (companyId !== undefined) updates.companyId = parseInt(companyId);
    if (participantName !== undefined && participantName !== null) {
      updates.participantName = String(participantName).trim();
    }
    if (participantJobTitle !== undefined && participantJobTitle !== null) {
      updates.participantJobTitle = String(participantJobTitle).trim();
    }
    if (date !== undefined) updates.date = date;
    if (time !== undefined) updates.time = time;
    if (type !== undefined) updates.type = type;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    // Update screening
    const updated = await db
      .update(screenings)
      .set(updates)
      .where(eq(screenings.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    logger.apiError('/api/screenings', error, 500);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

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

    // Delete screening
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
    logger.apiError('/api/screenings', error, 500);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}