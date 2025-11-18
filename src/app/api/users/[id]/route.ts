import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const VALID_ROLES = ['admin', 'manager', 'user', 'viewer'];

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to exclude passwordHash from user object
function excludePasswordHash(user: any) {
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Fetch user by ID
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Return user without passwordHash
    return NextResponse.json(excludePasswordHash(user[0]), { status: 200 });
  } catch (error) {
    console.error('GET user error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const userId = parseInt(id);

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      fullName,
      email,
      role,
      phone,
      avatarUrl,
      department,
      isActive,
      password,
    } = body;

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    // Validate and update fullName
    if (fullName !== undefined) {
      const trimmedName = fullName.trim();
      if (trimmedName === '') {
        return NextResponse.json(
          { error: 'Full name cannot be empty', code: 'INVALID_FULL_NAME' },
          { status: 400 }
        );
      }
      updates.fullName = trimmedName;
    }

    // Validate and update email
    if (email !== undefined) {
      const trimmedEmail = email.trim().toLowerCase();
      if (!isValidEmail(trimmedEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format', code: 'INVALID_EMAIL_FORMAT' },
          { status: 400 }
        );
      }

      // Check email uniqueness (exclude current user)
      const emailExists = await db
        .select()
        .from(users)
        .where(and(eq(users.email, trimmedEmail), ne(users.id, userId)))
        .limit(1);

      if (emailExists.length > 0) {
        return NextResponse.json(
          { error: 'Email already exists', code: 'DUPLICATE_EMAIL' },
          { status: 400 }
        );
      }

      updates.email = trimmedEmail;
    }

    // Validate and update role
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json(
          {
            error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
            code: 'INVALID_ROLE',
          },
          { status: 400 }
        );
      }
      updates.role = role;
    }

    // Validate and update phone
    if (phone !== undefined) {
      const trimmedPhone = phone.trim();
      if (trimmedPhone !== '' && trimmedPhone.length < 10) {
        return NextResponse.json(
          {
            error: 'Phone number must be at least 10 characters',
            code: 'INVALID_PHONE',
          },
          { status: 400 }
        );
      }
      updates.phone = trimmedPhone || null;
    }

    // Update avatarUrl
    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl?.trim() || null;
    }

    // Update department
    if (department !== undefined) {
      updates.department = department?.trim() || null;
    }

    // Update isActive
    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    // Validate and hash password if provided
    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json(
          {
            error: 'Password must be at least 6 characters',
            code: 'INVALID_PASSWORD',
          },
          { status: 400 }
        );
      }
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update user', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    // Return updated user without passwordHash
    return NextResponse.json(excludePasswordHash(updatedUser[0]), {
      status: 200,
    });
  } catch (error) {
    console.error('PUT user error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === 'true';

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const userId = parseInt(id);

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    let deletedUser;

    if (hard) {
      // Hard delete user row
      deletedUser = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning();
    } else {
      // Soft delete user (set isActive to false)
      deletedUser = await db
        .update(users)
        .set({
          isActive: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, userId))
        .returning();
    }

    if (deletedUser.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete user', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    // Return success message with deleted user details (without passwordHash)
    return NextResponse.json(
      {
        message: hard ? 'User permanently deleted' : 'User deactivated',
        user: excludePasswordHash(deletedUser[0]),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE user error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}