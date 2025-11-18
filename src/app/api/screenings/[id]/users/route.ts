import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screenings, screeningUsers, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET users assigned to a screening
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const screeningId = params.id;

    if (!screeningId || isNaN(parseInt(screeningId))) {
      return NextResponse.json(
        { error: 'Valid screening ID is required', code: 'INVALID_ID' },
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
        { error: 'Screening not found', code: 'SCREENING_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get all users assigned to this screening with full user details
    const assignedUsers = await db
      .select({
        assignmentId: screeningUsers.id,
        screeningId: screeningUsers.screeningId,
        userId: screeningUsers.userId,
        assignedAt: screeningUsers.assignedAt,
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phone: users.phone,
        department: users.department,
        isActive: users.isActive,
      })
      .from(screeningUsers)
      .innerJoin(users, eq(screeningUsers.userId, users.id))
      .where(eq(screeningUsers.screeningId, parseInt(screeningId)));

    return NextResponse.json(assignedUsers, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// POST assign user(s) to screening
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const screeningId = params.id;

    if (!screeningId || isNaN(parseInt(screeningId))) {
      return NextResponse.json(
        { error: 'Valid screening ID is required', code: 'INVALID_ID' },
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
        { error: 'Screening not found', code: 'SCREENING_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { userId, userIds } = body;

    // Validate that either userId or userIds is provided
    if (!userId && !userIds) {
      return NextResponse.json(
        { error: 'Either userId or userIds is required', code: 'MISSING_REQUIRED_FIELD' },
        { status: 400 }
      );
    }

    // Normalize to array for processing
    const userIdsArray = userIds ? userIds : [userId];

    // Validate all user IDs are valid integers
    for (const id of userIdsArray) {
      if (!id || isNaN(parseInt(id.toString()))) {
        return NextResponse.json(
          { error: 'Valid user ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }
    }

    // Check if all users exist and are active
    for (const id of userIdsArray) {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(id.toString())))
        .limit(1);

      if (user.length === 0) {
        return NextResponse.json(
          { error: `User with ID ${id} not found`, code: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      if (!user[0].isActive) {
        return NextResponse.json(
          { error: `User with ID ${id} is not active`, code: 'USER_INACTIVE' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate assignments
    for (const id of userIdsArray) {
      const existingAssignment = await db
        .select()
        .from(screeningUsers)
        .where(
          and(
            eq(screeningUsers.screeningId, parseInt(screeningId)),
            eq(screeningUsers.userId, parseInt(id.toString()))
          )
        )
        .limit(1);

      if (existingAssignment.length > 0) {
        return NextResponse.json(
          { error: `User ${id} already assigned to screening`, code: 'DUPLICATE_ASSIGNMENT' },
          { status: 400 }
        );
      }
    }

    // Insert assignments
    const createdAssignments = [];
    const timestamp = new Date().toISOString();

    for (const id of userIdsArray) {
      const assignment = await db
        .insert(screeningUsers)
        .values({
          screeningId: parseInt(screeningId),
          userId: parseInt(id.toString()),
          assignedAt: timestamp,
        })
        .returning();

      // Get full user details for the response
      const userDetails = await db
        .select({
          assignmentId: screeningUsers.id,
          screeningId: screeningUsers.screeningId,
          userId: screeningUsers.userId,
          assignedAt: screeningUsers.assignedAt,
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          phone: users.phone,
          department: users.department,
          isActive: users.isActive,
        })
        .from(screeningUsers)
        .innerJoin(users, eq(screeningUsers.userId, users.id))
        .where(eq(screeningUsers.id, assignment[0].id))
        .limit(1);

      createdAssignments.push(userDetails[0]);
    }

    // Return single object if single userId, array if userIds
    const response = userIds ? createdAssignments : createdAssignments[0];

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}