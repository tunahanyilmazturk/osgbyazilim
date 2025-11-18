import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { healthTests } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
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
        {
          error: 'Health test not found',
          code: 'TEST_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(test[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message
      },
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const existingTest = await db
      .select()
      .from(healthTests)
      .where(eq(healthTests.id, parseInt(id)))
      .limit(1);

    if (existingTest.length === 0) {
      return NextResponse.json(
        {
          error: 'Health test not found',
          code: 'TEST_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, code, price, isActive } = body;

    if (name !== undefined && (!name || name.trim() === '')) {
      return NextResponse.json(
        {
          error: 'Name cannot be empty',
          code: 'INVALID_NAME'
        },
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

    const updates: {
      name?: string;
      description?: string;
      code?: string;
      price?: number | null;
      isActive?: boolean;
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) {
      updates.name = name.trim();
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
        updates.price = parseFloat(price);
      }
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    const updatedTest = await db
      .update(healthTests)
      .set(updates)
      .where(eq(healthTests.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedTest[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message
      },
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    const existingTest = await db
      .select()
      .from(healthTests)
      .where(eq(healthTests.id, parseInt(id)))
      .limit(1);

    if (existingTest.length === 0) {
      return NextResponse.json(
        {
          error: 'Health test not found',
          code: 'TEST_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const deletedTest = await db
      .delete(healthTests)
      .where(eq(healthTests.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Health test deleted successfully',
        test: deletedTest[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message
      },
      { status: 500 }
    );
  }
}