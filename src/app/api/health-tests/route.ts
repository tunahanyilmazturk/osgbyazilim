import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { healthTests } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const isActiveParam = searchParams.get('isActive');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Single record by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const test = await db
        .select()
        .from(healthTests)
        .where(eq(healthTests.id, parseInt(id)))
        .limit(1);

      if (test.length === 0) {
        return NextResponse.json(
          { error: 'Health test not found', code: 'TEST_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(test[0], { status: 200 });
    }

    // List with filtering
    let query = db.select().from(healthTests);

    // Apply isActive filter if provided
    if (isActiveParam !== null) {
      const isActive = isActiveParam === '1' || isActiveParam === 'true';
      query = query.where(eq(healthTests.isActive, isActive));
    }

    const results = await query.limit(limit).offset(offset);

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
    const { name, description, code, price, isActive } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    // Trim and validate name is not empty
    const trimmedName = name.trim();
    if (trimmedName === '') {
      return NextResponse.json(
        { error: 'Name cannot be empty', code: 'INVALID_NAME' },
        { status: 400 }
      );
    }

    // Validate price if provided
    if (price !== undefined && price !== null) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          { error: 'Price must be a positive number', code: 'INVALID_PRICE' },
          { status: 400 }
        );
      }
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData: any = {
      name: trimmedName,
      description: description ? description.trim() : null,
      code: code ? code.trim() : null,
      price: price !== undefined && price !== null ? parseFloat(price) : null,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: now,
      updatedAt: now,
    };

    const newTest = await db.insert(healthTests).values(insertData).returning();

    return NextResponse.json(newTest[0], { status: 201 });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if test exists
    const existingTest = await db
      .select()
      .from(healthTests)
      .where(eq(healthTests.id, parseInt(id)))
      .limit(1);

    if (existingTest.length === 0) {
      return NextResponse.json(
        { error: 'Health test not found', code: 'TEST_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, code, price, isActive } = body;

    // Build update object
    const updates: any = {};

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName === '') {
        return NextResponse.json(
          { error: 'Name cannot be empty', code: 'INVALID_NAME' },
          { status: 400 }
        );
      }
      updates.name = trimmedName;
    }

    if (description !== undefined) {
      updates.description = description ? description.trim() : null;
    }

    if (code !== undefined) {
      updates.code = code ? code.trim() : null;
    }

    if (price !== undefined) {
      if (price === null) {
        updates.price = null;
      } else {
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          return NextResponse.json(
            { error: 'Price must be a positive number', code: 'INVALID_PRICE' },
            { status: 400 }
          );
        }
        updates.price = parsedPrice;
      }
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    // Check if there are any fields to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields provided for update', code: 'NO_UPDATE_FIELDS' },
        { status: 400 }
      );
    }

    // Always update updatedAt
    updates.updatedAt = new Date().toISOString();

    const updated = await db
      .update(healthTests)
      .set(updates)
      .where(eq(healthTests.id, parseInt(id)))
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if test exists
    const existingTest = await db
      .select()
      .from(healthTests)
      .where(eq(healthTests.id, parseInt(id)))
      .limit(1);

    if (existingTest.length === 0) {
      return NextResponse.json(
        { error: 'Health test not found', code: 'TEST_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(healthTests)
      .where(eq(healthTests.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Health test deleted successfully',
        test: deleted[0],
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