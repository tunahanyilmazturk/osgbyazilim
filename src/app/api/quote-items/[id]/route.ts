import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotes, quoteItems, healthTests, companies } from '@/db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/quote-items/[id] - Update a single quote item (quantity, unitPrice)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid item ID is required', code: 'INVALID_ITEM_ID' },
        { status: 400 }
      );
    }

    const itemId = parseInt(id);

    // Fetch existing item with quoteId
    const existingItems = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.id, itemId))
      .limit(1);

    if (existingItems.length === 0) {
      return NextResponse.json(
        { error: 'Quote item not found', code: 'ITEM_NOT_FOUND' },
        { status: 404 }
      );
    }

    const existingItem = existingItems[0];

    // Fetch quote to know current totals and VAT rate
    const existingQuotes = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, existingItem.quoteId))
      .limit(1);

    if (existingQuotes.length === 0) {
      return NextResponse.json(
        { error: 'Quote not found for item', code: 'QUOTE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const quote = existingQuotes[0];

    const body = await request.json();
    const { quantity, unitPrice } = body as {
      quantity?: number;
      unitPrice?: number;
    };

    const updates: Partial<typeof quoteItems.$inferInsert> = {};

    if (quantity !== undefined) {
      if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: 'Quantity must be a positive number', code: 'INVALID_QUANTITY' },
          { status: 400 }
        );
      }
      updates.quantity = quantity;
    }

    if (unitPrice !== undefined) {
      if (typeof unitPrice !== 'number' || !Number.isFinite(unitPrice) || unitPrice <= 0) {
        return NextResponse.json(
          { error: 'Unit price must be a positive number', code: 'INVALID_UNIT_PRICE' },
          { status: 400 }
        );
      }
      updates.unitPrice = unitPrice;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'NO_UPDATES' },
        { status: 400 }
      );
    }

    // Recalculate totalPrice when quantity or unitPrice changes
    const newQuantity = updates.quantity ?? existingItem.quantity;
    const newUnitPrice = updates.unitPrice ?? existingItem.unitPrice;
    updates.totalPrice = newQuantity * newUnitPrice;
    updates.updatedAt = new Date().toISOString();

    await db
      .update(quoteItems)
      .set(updates)
      .where(eq(quoteItems.id, itemId));

    // Recalculate quote subtotal, tax, total based on updated items
    const allItems = await db
      .select({
        totalPrice: quoteItems.totalPrice,
      })
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, existingItem.quoteId));

    const newSubtotal = allItems.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);

    // Preserve existing VAT rate if possible
    const oldVatRate = quote.subtotal > 0 ? quote.tax / quote.subtotal : 0;
    const newTax = newSubtotal * oldVatRate;
    const newTotal = newSubtotal + newTax;

    await db
      .update(quotes)
      .set({
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(quotes.id, existingItem.quoteId));

    // Return updated quote with items (same shape as /api/quotes/[id])
    const updatedQuoteWithCompany = await db
      .select({
        id: quotes.id,
        companyId: quotes.companyId,
        quoteNumber: quotes.quoteNumber,
        issueDate: quotes.issueDate,
        validUntilDate: quotes.validUntilDate,
        subtotal: quotes.subtotal,
        tax: quotes.tax,
        total: quotes.total,
        notes: quotes.notes,
        status: quotes.status,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
        company: {
          id: companies.id,
          name: companies.name,
          address: companies.address,
          contactPerson: companies.contactPerson,
          phone: companies.phone,
          email: companies.email,
        },
      })
      .from(quotes)
      .leftJoin(companies, eq(quotes.companyId, companies.id))
      .where(eq(quotes.id, existingItem.quoteId))
      .limit(1);

    const itemsWithTests = await db
      .select({
        id: quoteItems.id,
        quantity: quoteItems.quantity,
        unitPrice: quoteItems.unitPrice,
        totalPrice: quoteItems.totalPrice,
        description: quoteItems.description,
        createdAt: quoteItems.createdAt,
        test: {
          id: healthTests.id,
          name: healthTests.name,
          code: healthTests.code,
        },
      })
      .from(quoteItems)
      .leftJoin(healthTests, eq(quoteItems.healthTestId, healthTests.id))
      .where(eq(quoteItems.quoteId, existingItem.quoteId));

    const response = {
      ...updatedQuoteWithCompany[0],
      items: itemsWithTests,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('PATCH quote item error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/quote-items/[id] - Delete a single quote item and recompute quote totals
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid item ID is required', code: 'INVALID_ITEM_ID' },
        { status: 400 }
      );
    }

    const itemId = parseInt(id);

    // Fetch existing item with quoteId
    const existingItems = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.id, itemId))
      .limit(1);

    if (existingItems.length === 0) {
      return NextResponse.json(
        { error: 'Quote item not found', code: 'ITEM_NOT_FOUND' },
        { status: 404 }
      );
    }

    const existingItem = existingItems[0];

    // Fetch quote to know current VAT rate
    const existingQuotes = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, existingItem.quoteId))
      .limit(1);

    if (existingQuotes.length === 0) {
      return NextResponse.json(
        { error: 'Quote not found for item', code: 'QUOTE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const quote = existingQuotes[0];

    // Delete the item
    await db
      .delete(quoteItems)
      .where(eq(quoteItems.id, itemId));

    // Recalculate quote subtotal, tax, total based on remaining items
    const allItems = await db
      .select({
        totalPrice: quoteItems.totalPrice,
      })
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, existingItem.quoteId));

    const newSubtotal = allItems.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0);

    const oldVatRate = quote.subtotal > 0 ? quote.tax / quote.subtotal : 0;
    const newTax = newSubtotal * oldVatRate;
    const newTotal = newSubtotal + newTax;

    await db
      .update(quotes)
      .set({
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(quotes.id, existingItem.quoteId));

    // Return updated quote with items
    const updatedQuoteWithCompany = await db
      .select({
        id: quotes.id,
        companyId: quotes.companyId,
        quoteNumber: quotes.quoteNumber,
        issueDate: quotes.issueDate,
        validUntilDate: quotes.validUntilDate,
        subtotal: quotes.subtotal,
        tax: quotes.tax,
        total: quotes.total,
        notes: quotes.notes,
        status: quotes.status,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
        company: {
          id: companies.id,
          name: companies.name,
          address: companies.address,
          contactPerson: companies.contactPerson,
          phone: companies.phone,
          email: companies.email,
        },
      })
      .from(quotes)
      .leftJoin(companies, eq(quotes.companyId, companies.id))
      .where(eq(quotes.id, existingItem.quoteId))
      .limit(1);

    const itemsWithTests = await db
      .select({
        id: quoteItems.id,
        quantity: quoteItems.quantity,
        unitPrice: quoteItems.unitPrice,
        totalPrice: quoteItems.totalPrice,
        description: quoteItems.description,
        createdAt: quoteItems.createdAt,
        test: {
          id: healthTests.id,
          name: healthTests.name,
          code: healthTests.code,
        },
      })
      .from(quoteItems)
      .leftJoin(healthTests, eq(quoteItems.healthTestId, healthTests.id))
      .where(eq(quoteItems.quoteId, existingItem.quoteId));

    const response = {
      ...updatedQuoteWithCompany[0],
      items: itemsWithTests,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('DELETE quote item error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
