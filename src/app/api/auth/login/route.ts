import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Basic login endpoint: checks email/password and sets a simple session cookie
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required', code: 'MISSING_CREDENTIALS' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    const user = result[0] as any;

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'User is deactivated', code: 'USER_INACTIVE' },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(String(password), user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      );
    }

    const sessionPayload = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };

    const encoded = Buffer.from(JSON.stringify(sessionPayload)).toString('base64url');

    const response = NextResponse.json(sessionPayload, { status: 200 });
    response.cookies.set('app_session', encoded, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return response;
  } catch (error) {
    console.error('AUTH LOGIN error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
