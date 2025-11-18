import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

const VALID_NOTIFICATION_TYPES = [
  'upcoming_screening',
  'screening_today',
  'screening_completed',
  'screening_cancelled'
] as const;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single notification by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const notification = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, parseInt(id)))
        .limit(1);

      if (notification.length === 0) {
        return NextResponse.json(
          { error: 'Notification not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(notification[0], { status: 200 });
    }

    // List notifications with filters and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const employeeId = searchParams.get('employeeId');
    const screeningId = searchParams.get('screeningId');
    const type = searchParams.get('type');
    const isReadParam = searchParams.get('isRead');

    const conditions = [];

    if (employeeId) {
      if (isNaN(parseInt(employeeId))) {
        return NextResponse.json(
          { error: 'Valid employeeId is required', code: 'INVALID_EMPLOYEE_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(notifications.employeeId, parseInt(employeeId)));
    }

    if (screeningId) {
      if (isNaN(parseInt(screeningId))) {
        return NextResponse.json(
          { error: 'Valid screeningId is required', code: 'INVALID_SCREENING_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(notifications.screeningId, parseInt(screeningId)));
    }

    if (type) {
      if (!VALID_NOTIFICATION_TYPES.includes(type as any)) {
        return NextResponse.json(
          { 
            error: `Invalid notification type. Must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`,
            code: 'INVALID_TYPE'
          },
          { status: 400 }
        );
      }
      conditions.push(eq(notifications.type, type));
    }

    if (isReadParam !== null) {
      const isReadValue = isReadParam === '1' || isReadParam === 'true';
      conditions.push(eq(notifications.isRead, isReadValue));
    }

    let query = db.select().from(notifications);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

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
    const { type, title, message, screeningId, employeeId, scheduledFor } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: 'Type is required', code: 'MISSING_TYPE' },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required', code: 'MISSING_TITLE' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required', code: 'MISSING_MESSAGE' },
        { status: 400 }
      );
    }

    // Validate type
    if (!VALID_NOTIFICATION_TYPES.includes(type as any)) {
      return NextResponse.json(
        { 
          error: `Invalid notification type. Must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`,
          code: 'INVALID_TYPE'
        },
        { status: 400 }
      );
    }

    // Validate optional integer fields
    if (screeningId !== undefined && screeningId !== null) {
      if (isNaN(parseInt(screeningId))) {
        return NextResponse.json(
          { error: 'Valid screeningId is required', code: 'INVALID_SCREENING_ID' },
          { status: 400 }
        );
      }
    }

    if (employeeId !== undefined && employeeId !== null) {
      if (isNaN(parseInt(employeeId))) {
        return NextResponse.json(
          { error: 'Valid employeeId is required', code: 'INVALID_EMPLOYEE_ID' },
          { status: 400 }
        );
      }
    }

    // Prepare insert data
    const insertData: any = {
      type: type.trim(),
      title: title.trim(),
      message: message.trim(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    if (screeningId !== undefined && screeningId !== null) {
      insertData.screeningId = parseInt(screeningId);
    }

    if (employeeId !== undefined && employeeId !== null) {
      insertData.employeeId = parseInt(employeeId);
    }

    if (scheduledFor) {
      insertData.scheduledFor = scheduledFor;
    }

    const newNotification = await db
      .insert(notifications)
      .values(insertData)
      .returning();

    return NextResponse.json(newNotification[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, title, message, screeningId, employeeId, isRead, scheduledFor } = body;

    // Check if notification exists
    const existing = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (type && !VALID_NOTIFICATION_TYPES.includes(type as any)) {
      return NextResponse.json(
        { 
          error: `Invalid notification type. Must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`,
          code: 'INVALID_TYPE'
        },
        { status: 400 }
      );
    }

    // Validate integer fields if provided
    if (screeningId !== undefined && screeningId !== null && isNaN(parseInt(screeningId))) {
      return NextResponse.json(
        { error: 'Valid screeningId is required', code: 'INVALID_SCREENING_ID' },
        { status: 400 }
      );
    }

    if (employeeId !== undefined && employeeId !== null && isNaN(parseInt(employeeId))) {
      return NextResponse.json(
        { error: 'Valid employeeId is required', code: 'INVALID_EMPLOYEE_ID' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (type !== undefined) {
      updateData.type = type.trim();
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return NextResponse.json(
          { error: 'Title cannot be empty', code: 'INVALID_TITLE' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (message !== undefined) {
      if (typeof message !== 'string' || message.trim() === '') {
        return NextResponse.json(
          { error: 'Message cannot be empty', code: 'INVALID_MESSAGE' },
          { status: 400 }
        );
      }
      updateData.message = message.trim();
    }

    if (screeningId !== undefined) {
      updateData.screeningId = screeningId === null ? null : parseInt(screeningId);
    }

    if (employeeId !== undefined) {
      updateData.employeeId = employeeId === null ? null : parseInt(employeeId);
    }

    if (isRead !== undefined) {
      updateData.isRead = Boolean(isRead);
    }

    if (scheduledFor !== undefined) {
      updateData.scheduledFor = scheduledFor;
    }

    const updated = await db
      .update(notifications)
      .set(updateData)
      .where(eq(notifications.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if notification exists
    const existing = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(notifications)
      .where(eq(notifications.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      { 
        message: 'Notification deleted successfully',
        notification: deleted[0]
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