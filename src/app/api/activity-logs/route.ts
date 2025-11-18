import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { activityLogs, users } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single activity log by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const result = await db
        .select({
          id: activityLogs.id,
          userId: activityLogs.userId,
          action: activityLogs.action,
          resourceType: activityLogs.resourceType,
          resourceId: activityLogs.resourceId,
          details: activityLogs.details,
          ipAddress: activityLogs.ipAddress,
          createdAt: activityLogs.createdAt,
          user: {
            id: users.id,
            fullName: users.fullName,
            email: users.email,
          },
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .where(eq(activityLogs.id, parseInt(id)))
        .limit(1);

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Activity log not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(result[0], { status: 200 });
    }

    // List activity logs with filtering and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const userIdFilter = searchParams.get('userId');
    const actionFilter = searchParams.get('action');
    const resourceTypeFilter = searchParams.get('resourceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate date formats if provided
    if (startDate) {
      const startDateObj = new Date(startDate);
      if (isNaN(startDateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid startDate format. Use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)', code: 'INVALID_DATE_FORMAT' },
          { status: 400 }
        );
      }
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      if (isNaN(endDateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid endDate format. Use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)', code: 'INVALID_DATE_FORMAT' },
          { status: 400 }
        );
      }
    }

    // Build WHERE conditions
    const conditions = [];

    if (userIdFilter) {
      const userIdInt = parseInt(userIdFilter);
      if (!isNaN(userIdInt)) {
        conditions.push(eq(activityLogs.userId, userIdInt));
      }
    }

    if (actionFilter) {
      conditions.push(eq(activityLogs.action, actionFilter));
    }

    if (resourceTypeFilter) {
      conditions.push(eq(activityLogs.resourceType, resourceTypeFilter));
    }

    if (startDate) {
      conditions.push(gte(activityLogs.createdAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(activityLogs.createdAt, endDate));
    }

    // Execute query with filters
    let query = db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        action: activityLogs.action,
        resourceType: activityLogs.resourceType,
        resourceId: activityLogs.resourceId,
        details: activityLogs.details,
        ipAddress: activityLogs.ipAddress,
        createdAt: activityLogs.createdAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query;

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, resourceType, resourceId, details, ipAddress } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    if (!action || action.trim() === '') {
      return NextResponse.json(
        { error: 'action is required and cannot be empty', code: 'MISSING_ACTION' },
        { status: 400 }
      );
    }

    // Validate userId is a valid integer
    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt)) {
      return NextResponse.json(
        { error: 'userId must be a valid integer', code: 'INVALID_USER_ID' },
        { status: 400 }
      );
    }

    // Validate userId exists in users table
    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userIdInt))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json(
        { error: 'User with provided userId does not exist', code: 'USER_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Validate resourceId if provided
    if (resourceId !== undefined && resourceId !== null) {
      const resourceIdInt = parseInt(resourceId);
      if (isNaN(resourceIdInt)) {
        return NextResponse.json(
          { error: 'resourceId must be a valid integer', code: 'INVALID_RESOURCE_ID' },
          { status: 400 }
        );
      }
    }

    // Validate details is valid JSON if provided
    if (details !== undefined && details !== null) {
      try {
        if (typeof details === 'string') {
          JSON.parse(details);
        } else if (typeof details === 'object') {
          // If it's already an object, stringify it
          JSON.stringify(details);
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'details must be valid JSON', code: 'INVALID_JSON_DETAILS' },
          { status: 400 }
        );
      }
    }

    // Prepare insert data
    const insertData: any = {
      userId: userIdInt,
      action: action.trim(),
      createdAt: new Date().toISOString(),
    };

    if (resourceType !== undefined && resourceType !== null) {
      insertData.resourceType = resourceType;
    }

    if (resourceId !== undefined && resourceId !== null) {
      insertData.resourceId = parseInt(resourceId);
    }

    if (details !== undefined && details !== null) {
      // Store as string if it's an object
      insertData.details = typeof details === 'string' ? details : JSON.stringify(details);
    }

    if (ipAddress !== undefined && ipAddress !== null) {
      insertData.ipAddress = ipAddress;
    }

    // Insert activity log
    const newLog = await db
      .insert(activityLogs)
      .values(insertData)
      .returning();

    return NextResponse.json(newLog[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}