import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotes, quoteItems, healthTests } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { id, itemId } = params;

    // Validate IDs
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid quote ID is required', code: 'INVALID_QUOTE_ID' },
        { status: 400 }
      );
    }

    if (!itemId || isNaN(parseInt(itemId))) {
      return NextResponse.json(
        { error: 'Valid item ID is required', code: 'INVALID_ITEM_ID' },
        { status: 400 }
      );
    }

    const quoteId = parseInt(id);
    const quoteItemId = parseInt(itemId);

    // Verify quote exists
    const quote = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    if (quote.length === 0) {
      return NextResponse.json(
        { error: 'Quote not found', code: 'QUOTE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify item exists and belongs to the quote
    const item = await db
      .select()
      .from(quoteItems)
      .where(and(eq(quoteItems.id, quoteItemId), eq(quoteItems.quoteId, quoteId)))
      .limit(1);

    if (item.length === 0) {
      return NextResponse.json(
        {
          error: 'Quote item not found or does not belong to this quote',
          code: 'ITEM_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { quantity, unitPrice, description, healthTestId } = body;

    // Validate inputs
    if (quantity !== undefined) {
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: 'Quantity must be a positive integer', code: 'INVALID_QUANTITY' },
          { status: 400 }
        );
      }
    }

    if (unitPrice !== undefined) {
      if (typeof unitPrice !== 'number' || unitPrice <= 0) {
        return NextResponse.json(
          { error: 'Unit price must be a positive number', code: 'INVALID_UNIT_PRICE' },
          { status: 400 }
        );
      }
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim() === '') {
        return NextResponse.json(
          { error: 'Description cannot be empty', code: 'INVALID_DESCRIPTION' },
          { status: 400 }
        );
      }
    }

    if (healthTestId !== undefined && healthTestId !== null) {
      const test = await db
        .select()
        .from(healthTests)
        .where(eq(healthTests.id, healthTestId))
        .limit(1);

      if (test.length === 0) {
        return NextResponse.json(
          { error: 'Health test not found', code: 'INVALID_HEALTH_TEST' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const currentItem = item[0];
    const updatedQuantity = quantity !== undefined ? quantity : currentItem.quantity;
    const updatedUnitPrice = unitPrice !== undefined ? unitPrice : currentItem.unitPrice;
    const updatedTotalPrice =
      quantity !== undefined || unitPrice !== undefined
        ? parseFloat((updatedQuantity * updatedUnitPrice).toFixed(2))
        : currentItem.totalPrice;

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (quantity !== undefined) updateData.quantity = quantity;
    if (unitPrice !== undefined) updateData.unitPrice = unitPrice;
    if (description !== undefined) updateData.description = description.trim();
    if (healthTestId !== undefined) updateData.healthTestId = healthTestId;
    if (quantity !== undefined || unitPrice !== undefined) {
      updateData.totalPrice = updatedTotalPrice;
    }

    // Update the item
    const updatedItem = await db
      .update(quoteItems)
      .set(updateData)
      .where(and(eq(quoteItems.id, quoteItemId), eq(quoteItems.quoteId, quoteId)))
      .returning();

    if (updatedItem.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update item', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    // Recalculate quote totals
    const allItems = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quoteId));

    const subtotal = parseFloat(
      allItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)
    );
    const tax = parseFloat((subtotal * 0.18).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    await db
      .update(quotes)
      .set({
        subtotal,
        tax,
        total,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(quotes.id, quoteId));

    // Get test details if healthTestId exists
    let testDetails = null;
    if (updatedItem[0].healthTestId) {
      const test = await db
        .select()
        .from(healthTests)
        .where(eq(healthTests.id, updatedItem[0].healthTestId))
        .limit(1);

      if (test.length > 0) {
        testDetails = test[0];
      }
    }

    return NextResponse.json({
      ...updatedItem[0],
      test: testDetails,
    });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const { id, itemId } = params;

    // Validate IDs
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid quote ID is required', code: 'INVALID_QUOTE_ID' },
        { status: 400 }
      );
    }

    if (!itemId || isNaN(parseInt(itemId))) {
      return NextResponse.json(
        { error: 'Valid item ID is required', code: 'INVALID_ITEM_ID' },
        { status: 400 }
      );
    }

    const quoteId = parseInt(id);
    const quoteItemId = parseInt(itemId);

    // Verify quote exists
    const quote = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    if (quote.length === 0) {
      return NextResponse.json(
        { error: 'Quote not found', code: 'QUOTE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify item exists and belongs to the quote
    const item = await db
      .select()
      .from(quoteItems)
      .where(and(eq(quoteItems.id, quoteItemId), eq(quoteItems.quoteId, quoteId)))
      .limit(1);

    if (item.length === 0) {
      return NextResponse.json(
        {
          error: 'Quote item not found or does not belong to this quote',
          code: 'ITEM_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Delete the item
    const deleted = await db
      .delete(quoteItems)
      .where(and(eq(quoteItems.id, quoteItemId), eq(quoteItems.quoteId, quoteId)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete item', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    // Recalculate quote totals
    const allItems = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, quoteId));

    const subtotal = parseFloat(
      allItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)
    );
    const tax = parseFloat((subtotal * 0.18).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    await db
      .update(quotes)
      .set({
        subtotal,
        tax,
        total,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(quotes.id, quoteId));

    return NextResponse.json({
      message: 'Quote item deleted successfully',
      item: deleted[0],
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}