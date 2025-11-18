import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotes, quoteItems, companies, healthTests } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Fetch quote with company details
    const quote = await db
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
      .where(eq(quotes.id, parseInt(id)))
      .limit(1);

    if (quote.length === 0) {
      return NextResponse.json(
        { error: 'Quote not found', code: 'QUOTE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Fetch quote items with health test details
    const items = await db
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
      .where(eq(quoteItems.quoteId, parseInt(id)));

    // Combine quote with items
    const result = {
      ...quote[0],
      items,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if quote exists
    const existingQuote = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, parseInt(id)))
      .limit(1);

    if (existingQuote.length === 0) {
      return NextResponse.json(
        { error: 'Quote not found', code: 'QUOTE_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      companyId,
      issueDate,
      validUntilDate,
      subtotal,
      tax,
      total,
      notes,
      status,
    } = body;

    // Validate companyId if provided
    if (companyId !== undefined) {
      if (typeof companyId !== 'number' || companyId <= 0) {
        return NextResponse.json(
          { error: 'Valid company ID is required', code: 'INVALID_COMPANY_ID' },
          { status: 400 }
        );
      }

      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (company.length === 0) {
        return NextResponse.json(
          { error: 'Company not found', code: 'COMPANY_NOT_FOUND' },
          { status: 404 }
        );
      }
    }

    // Validate status if provided
    if (status !== undefined) {
      const validStatuses = ['draft', 'sent', 'accepted', 'rejected'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: `Status must be one of: ${validStatuses.join(', ')}`,
            code: 'INVALID_STATUS',
          },
          { status: 400 }
        );
      }
    }

    // Validate dates if provided
    if (issueDate !== undefined) {
      const date = new Date(issueDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid issue date format', code: 'INVALID_DATE_FORMAT' },
          { status: 400 }
        );
      }
    }

    if (validUntilDate !== undefined) {
      const date = new Date(validUntilDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid valid until date format',
            code: 'INVALID_DATE_FORMAT',
          },
          { status: 400 }
        );
      }
    }

    // Validate numbers if provided
    if (subtotal !== undefined && (typeof subtotal !== 'number' || subtotal < 0)) {
      return NextResponse.json(
        { error: 'Subtotal must be a positive number', code: 'INVALID_SUBTOTAL' },
        { status: 400 }
      );
    }

    if (tax !== undefined && (typeof tax !== 'number' || tax < 0)) {
      return NextResponse.json(
        { error: 'Tax must be a positive number', code: 'INVALID_TAX' },
        { status: 400 }
      );
    }

    if (total !== undefined && (typeof total !== 'number' || total < 0)) {
      return NextResponse.json(
        { error: 'Total must be a positive number', code: 'INVALID_TOTAL' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (companyId !== undefined) updates.companyId = companyId;
    if (issueDate !== undefined) updates.issueDate = issueDate;
    if (validUntilDate !== undefined) updates.validUntilDate = validUntilDate;
    if (subtotal !== undefined) updates.subtotal = subtotal;
    if (tax !== undefined) updates.tax = tax;
    if (total !== undefined) updates.total = total;
    if (notes !== undefined) updates.notes = notes;
    if (status !== undefined) updates.status = status;

    // Update quote
    const updated = await db
      .update(quotes)
      .set(updates)
      .where(eq(quotes.id, parseInt(id)))
      .returning();

    // Fetch updated quote with company details
    const updatedQuote = await db
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
      .where(eq(quotes.id, parseInt(id)))
      .limit(1);

    // Fetch quote items
    const items = await db
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
      .where(eq(quoteItems.quoteId, parseInt(id)));

    // Combine quote with items
    const result = {
      ...updatedQuote[0],
      items,
    };

    return NextResponse.json(result, { status: 200 });
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
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if quote exists
    const existingQuote = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, parseInt(id)))
      .limit(1);

    if (existingQuote.length === 0) {
      return NextResponse.json(
        { error: 'Quote not found', code: 'QUOTE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete quote (cascade will delete quote_items)
    const deleted = await db
      .delete(quotes)
      .where(eq(quotes.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Quote deleted successfully',
        quote: deleted[0],
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