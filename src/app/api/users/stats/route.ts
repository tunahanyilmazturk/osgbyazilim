import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, gte, sql, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Calculate date 7 days ago for recent logins
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // Get total users count
    const totalUsersResult = await db
      .select({ count: count() })
      .from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get active users count
    const activeUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isActive, true));
    const activeUsers = activeUsersResult[0]?.count || 0;

    // Get inactive users count
    const inactiveUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isActive, false));
    const inactiveUsers = inactiveUsersResult[0]?.count || 0;

    // Get users by role
    const usersByRoleResult = await db
      .select({
        role: users.role,
        count: count(),
      })
      .from(users)
      .groupBy(users.role);

    // Transform usersByRole into object format
    const usersByRole: Record<string, number> = {
      admin: 0,
      manager: 0,
      user: 0,
      viewer: 0,
    };

    usersByRoleResult.forEach((item) => {
      if (item.role) {
        usersByRole[item.role] = item.count;
      }
    });

    // Get recent logins (within last 7 days)
    const recentLoginsResult = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          sql`${users.lastLoginAt} IS NOT NULL`,
          gte(users.lastLoginAt, sevenDaysAgoISO)
        )
      );
    const recentLogins = recentLoginsResult[0]?.count || 0;

    // Return statistics
    return NextResponse.json(
      {
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersByRole,
        recentLogins,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/users/stats error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}