import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single user by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const user = await db.select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        department: users.department,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
        .from(users)
        .where(eq(users.id, parseInt(id)))
        .limit(1);

      if (user.length === 0) {
        return NextResponse.json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(user[0]);
    }

    // List users with filtering and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const roleFilter = searchParams.get('role');
    const isActiveFilter = searchParams.get('isActive');

    const baseQuery = db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      department: users.department,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users);

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(users.fullName, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    if (roleFilter) {
      conditions.push(eq(users.role, roleFilter));
    }

    if (isActiveFilter !== null && isActiveFilter !== undefined) {
      const isActiveValue = isActiveFilter === 'true';
      conditions.push(eq(users.isActive, isActiveValue));
    }

    const query = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

    const results = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, password, role, phone, avatarUrl, department } = body;

    // Validate required fields
    if (!fullName || fullName.trim() === '') {
      return NextResponse.json({ 
        error: "Full name is required",
        code: "MISSING_FULL_NAME" 
      }, { status: 400 });
    }

    if (!email || email.trim() === '') {
      return NextResponse.json({ 
        error: "Email is required",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    // Validate email format
    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL_FORMAT" 
      }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ 
        error: "Password is required and must be at least 6 characters",
        code: "INVALID_PASSWORD" 
      }, { status: 400 });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'user', 'viewer'];
    const userRole = role || 'user';
    if (!validRoles.includes(userRole)) {
      return NextResponse.json({ 
        error: "Role must be one of: admin, manager, user, viewer",
        code: "INVALID_ROLE" 
      }, { status: 400 });
    }

    // Validate phone if provided
    if (phone && phone.length < 10) {
      return NextResponse.json({ 
        error: "Phone number must be at least 10 characters",
        code: "INVALID_PHONE" 
      }, { status: 400 });
    }

    // Check email uniqueness
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ 
        error: "Email already exists",
        code: "DUPLICATE_EMAIL" 
      }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const now = new Date().toISOString();
    const newUser = await db.insert(users)
      .values({
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: userRole,
        phone: phone?.trim() || null,
        avatarUrl: avatarUrl?.trim() || null,
        department: department?.trim() || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        department: users.department,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return NextResponse.json(newUser[0], { status: 201 });
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    const body = await request.json();
    const { fullName, email, role, phone, avatarUrl, department, isActive, password } = body;

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    // Validate and update fields
    if (fullName !== undefined) {
      if (fullName.trim() === '') {
        return NextResponse.json({ 
          error: "Full name cannot be empty",
          code: "INVALID_FULL_NAME" 
        }, { status: 400 });
      }
      updates.fullName = fullName.trim();
    }

    if (email !== undefined) {
      if (email.trim() === '') {
        return NextResponse.json({ 
          error: "Email cannot be empty",
          code: "INVALID_EMAIL" 
        }, { status: 400 });
      }

      // Validate email format
      if (!email.includes('@') || !email.includes('.')) {
        return NextResponse.json({ 
          error: "Invalid email format",
          code: "INVALID_EMAIL_FORMAT" 
        }, { status: 400 });
      }

      // Check email uniqueness (excluding current user)
      const normalizedEmail = email.toLowerCase().trim();
      const emailCheck = await db.select()
        .from(users)
        .where(and(
          eq(users.email, normalizedEmail),
          eq(users.id, parseInt(id))
        ))
        .limit(1);

      if (emailCheck.length === 0) {
        const duplicateCheck = await db.select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);

        if (duplicateCheck.length > 0) {
          return NextResponse.json({ 
            error: "Email already exists",
            code: "DUPLICATE_EMAIL" 
          }, { status: 400 });
        }
      }

      updates.email = normalizedEmail;
    }

    if (role !== undefined) {
      const validRoles = ['admin', 'manager', 'user', 'viewer'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ 
          error: "Role must be one of: admin, manager, user, viewer",
          code: "INVALID_ROLE" 
        }, { status: 400 });
      }
      updates.role = role;
    }

    if (phone !== undefined) {
      if (phone && phone.length < 10) {
        return NextResponse.json({ 
          error: "Phone number must be at least 10 characters",
          code: "INVALID_PHONE" 
        }, { status: 400 });
      }
      updates.phone = phone?.trim() || null;
    }

    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl?.trim() || null;
    }

    if (department !== undefined) {
      updates.department = department?.trim() || null;
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json({ 
          error: "Password must be at least 6 characters",
          code: "INVALID_PASSWORD" 
        }, { status: 400 });
      }
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await db.update(users)
      .set(updates)
      .where(eq(users.id, parseInt(id)))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        department: users.department,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return NextResponse.json(updated[0]);
  } catch (error: any) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Soft delete: set isActive to false
    const deleted = await db.update(users)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, parseInt(id)))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        department: users.department,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return NextResponse.json({
      message: 'User successfully deactivated',
      user: deleted[0]
    });
  } catch (error: any) {
    console.error('DELETE error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + message 
    }, { status: 500 });
  }
}