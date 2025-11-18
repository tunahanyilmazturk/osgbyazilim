import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screeningUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE - Unassign user from screening
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const { id: screeningId, userId } = params;

    if (!screeningId || isNaN(parseInt(screeningId))) {
      return NextResponse.json(
        { error: 'Valid screening ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    if (!userId || isNaN(parseInt(userId))) {
      return NextResponse.json(
        { error: 'Valid user ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if assignment exists
    const existing = await db
      .select()
      .from(screeningUsers)
      .where(
        and(
          eq(screeningUsers.screeningId, parseInt(screeningId)),
          eq(screeningUsers.userId, parseInt(userId))
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete assignment
    await db
      .delete(screeningUsers)
      .where(eq(screeningUsers.id, existing[0].id));

    return NextResponse.json(
      { message: 'User unassigned successfully' },
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
