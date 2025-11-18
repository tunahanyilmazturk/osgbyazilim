import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotes, quoteItems, healthTests } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// GET /api/quotes/[id]/items - List all items for a quote
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;

    // Validate quoteId is valid integer
    if (!quoteId || isNaN(parseInt(quoteId))) {
      return NextResponse.json(
        { error: 'Valid quote ID is required', code: 'INVALID_QUOTE_ID' },
        { status: 400 }
      );
    }

    const parsedQuoteId = parseInt(quoteId);

    // Verify quote exists
    const quote = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, parsedQuoteId))
      .limit(1);

    if (quote.length === 0) {
      return NextResponse.json(
        { error: 'Quote not found', code: 'QUOTE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get all quote items with test details
    const items = await db
      .select({
        id: quoteItems.id,
        quoteId: quoteItems.quoteId,
        healthTestId: quoteItems.healthTestId,
        quantity: quoteItems.quantity,
        unitPrice: quoteItems.unitPrice,
        totalPrice: quoteItems.totalPrice,
        description: quoteItems.description,
        createdAt: quoteItems.createdAt,
        updatedAt: quoteItems.updatedAt,
        test: {
          id: healthTests.id,
          name: healthTests.name,
          code: healthTests.code,
        },
      })
      .from(quoteItems)
      .leftJoin(healthTests, eq(quoteItems.healthTestId, healthTests.id))
      .where(eq(quoteItems.quoteId, parsedQuoteId))
      .orderBy(quoteItems.createdAt);

    // Format response to include test details only if healthTestId is not null
    const formattedItems = items.map((item) => ({
      id: item.id,
      quoteId: item.quoteId,
      healthTestId: item.healthTestId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      description: item.description,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      ...(item.healthTestId && item.test.id
        ? {
            test: {
              id: item.test.id,
              name: item.test.name,
              code: item.test.code,
            },
          }
        : {}),
    }));

    return NextResponse.json(formattedItems, { status: 200 });
  } catch (error) {
    console.error('GET quote items error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/quotes/[id]/items - Add item to quote
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;

    // Validate quoteId is valid integer
    if (!quoteId || isNaN(parseInt(quoteId))) {
      return NextResponse.json(
        { error: 'Valid quote ID is required', code: 'INVALID_QUOTE_ID' },
        { status: 400 }
      );
    }

    const parsedQuoteId = parseInt(quoteId);

    // Verify quote exists
    const quote = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, parsedQuoteId))
      .limit(1);

    if (quote.length === 0) {
      return NextResponse.json(
        { error: 'Quote not found', code: 'QUOTE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { quantity, unitPrice, description, healthTestId } = body;

    // Validate required fields
    if (!quantity) {
      return NextResponse.json(
        { error: 'Quantity is required', code: 'MISSING_QUANTITY' },
        { status: 400 }
      );
    }

    if (!unitPrice) {
      return NextResponse.json(
        { error: 'Unit price is required', code: 'MISSING_UNIT_PRICE' },
        { status: 400 }
      );
    }

    if (!description || description.trim() === '') {
      return NextResponse.json(
        { error: 'Description is required', code: 'MISSING_DESCRIPTION' },
        { status: 400 }
      );
    }

    // Validate quantity is positive integer
    const parsedQuantity = parseInt(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return NextResponse.json(
        {
          error: 'Quantity must be a positive integer',
          code: 'INVALID_QUANTITY',
        },
        { status: 400 }
      );
    }

    // Validate unitPrice is positive number
    const parsedUnitPrice = parseFloat(unitPrice);
    if (isNaN(parsedUnitPrice) || parsedUnitPrice <= 0) {
      return NextResponse.json(
        {
          error: 'Unit price must be a positive number',
          code: 'INVALID_UNIT_PRICE',
        },
        { status: 400 }
      );
    }

    // Validate healthTestId exists if provided
    if (healthTestId !== undefined && healthTestId !== null) {
      const parsedTestId = parseInt(healthTestId);
      if (isNaN(parsedTestId)) {
        return NextResponse.json(
          {
            error: 'Health test ID must be a valid integer',
            code: 'INVALID_HEALTH_TEST_ID',
          },
          { status: 400 }
        );
      }

      const test = await db
        .select()
        .from(healthTests)
        .where(eq(healthTests.id, parsedTestId))
        .limit(1);

      if (test.length === 0) {
        return NextResponse.json(
          {
            error: 'Health test not found',
            code: 'HEALTH_TEST_NOT_FOUND',
          },
          { status: 404 }
        );
      }
    }

    // Calculate totalPrice
    const totalPrice = parsedQuantity * parsedUnitPrice;

    // Create quote item
    const now = new Date().toISOString();
    const newItem = await db
      .insert(quoteItems)
      .values({
        quoteId: parsedQuoteId,
        healthTestId: healthTestId ? parseInt(healthTestId) : null,
        quantity: parsedQuantity,
        unitPrice: parsedUnitPrice,
        totalPrice: totalPrice,
        description: description.trim(),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Get test details if healthTestId is provided
    let testDetails = null;
    if (newItem[0].healthTestId) {
      const test = await db
        .select({
          id: healthTests.id,
          name: healthTests.name,
          code: healthTests.code,
        })
        .from(healthTests)
        .where(eq(healthTests.id, newItem[0].healthTestId))
        .limit(1);

      if (test.length > 0) {
        testDetails = test[0];
      }
    }

    // Format response
    const response = {
      ...newItem[0],
      ...(testDetails ? { test: testDetails } : {}),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST quote item error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}