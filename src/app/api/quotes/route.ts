import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quotes, quoteItems, companies, healthTests } from '@/db/schema';
import { eq, desc, and, sql, like, or } from 'drizzle-orm';

// Helper function to generate quote number
function generateQuoteNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `QT-${dateStr}-${randomNum}`;
}

// Helper function to validate date format
function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

// Helper function to validate status
function isValidStatus(status: string): boolean {
  const validStatuses = ['draft', 'sent', 'accepted', 'rejected'];
  return validStatuses.includes(status);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Get single quote with full details
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        }, { status: 400 });
      }

      const quoteId = parseInt(id);

      // Get quote with company details
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
          }
        })
        .from(quotes)
        .leftJoin(companies, eq(quotes.companyId, companies.id))
        .where(eq(quotes.id, quoteId))
        .limit(1);

      if (quote.length === 0) {
        return NextResponse.json({
          error: 'Quote not found',
          code: 'QUOTE_NOT_FOUND'
        }, { status: 404 });
      }

      // Get quote items with health test details
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
          healthTest: {
            id: healthTests.id,
            name: healthTests.name,
            code: healthTests.code,
            description: healthTests.description,
          }
        })
        .from(quoteItems)
        .leftJoin(healthTests, eq(quoteItems.healthTestId, healthTests.id))
        .where(eq(quoteItems.quoteId, quoteId));

      const result = {
        ...quote[0],
        items: items
      };

      return NextResponse.json(result, { status: 200 });
    }

    // Get list of quotes with filters
    let conditions = [];

    if (companyId) {
      const companyIdInt = parseInt(companyId);
      if (isNaN(companyIdInt)) {
        return NextResponse.json({
          error: 'Valid company ID is required',
          code: 'INVALID_COMPANY_ID'
        }, { status: 400 });
      }
      conditions.push(eq(quotes.companyId, companyIdInt));
    }

    if (status) {
      if (!isValidStatus(status)) {
        return NextResponse.json({
          error: 'Invalid status. Must be one of: draft, sent, accepted, rejected',
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      conditions.push(eq(quotes.status, status));
    }

    // Build query with company details and item count
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const quotesWithDetails = await db
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
        companyName: companies.name,
        companyContactPerson: companies.contactPerson,
        itemCount: sql<number>`(SELECT COUNT(*) FROM ${quoteItems} WHERE ${quoteItems.quoteId} = ${quotes.id})`
      })
      .from(quotes)
      .leftJoin(companies, eq(quotes.companyId, companies.id))
      .where(whereCondition)
      .orderBy(desc(quotes.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(quotesWithDetails, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyId,
      quoteNumber,
      issueDate,
      validUntilDate,
      subtotal,
      tax,
      total,
      notes,
      status
    } = body;

    // Validate required fields
    if (!companyId) {
      return NextResponse.json({
        error: 'Company ID is required',
        code: 'MISSING_COMPANY_ID'
      }, { status: 400 });
    }

    if (!issueDate) {
      return NextResponse.json({
        error: 'Issue date is required',
        code: 'MISSING_ISSUE_DATE'
      }, { status: 400 });
    }

    if (!validUntilDate) {
      return NextResponse.json({
        error: 'Valid until date is required',
        code: 'MISSING_VALID_UNTIL_DATE'
      }, { status: 400 });
    }

    if (subtotal === undefined || subtotal === null) {
      return NextResponse.json({
        error: 'Subtotal is required',
        code: 'MISSING_SUBTOTAL'
      }, { status: 400 });
    }

    if (tax === undefined || tax === null) {
      return NextResponse.json({
        error: 'Tax is required',
        code: 'MISSING_TAX'
      }, { status: 400 });
    }

    if (total === undefined || total === null) {
      return NextResponse.json({
        error: 'Total is required',
        code: 'MISSING_TOTAL'
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({
        error: 'Status is required',
        code: 'MISSING_STATUS'
      }, { status: 400 });
    }

    // Validate companyId is valid integer
    const companyIdInt = parseInt(companyId);
    if (isNaN(companyIdInt)) {
      return NextResponse.json({
        error: 'Company ID must be a valid integer',
        code: 'INVALID_COMPANY_ID'
      }, { status: 400 });
    }

    // Validate company exists
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyIdInt))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json({
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND'
      }, { status: 404 });
    }

    // Validate dates
    if (!isValidDate(issueDate)) {
      return NextResponse.json({
        error: 'Issue date must be a valid date format',
        code: 'INVALID_ISSUE_DATE'
      }, { status: 400 });
    }

    if (!isValidDate(validUntilDate)) {
      return NextResponse.json({
        error: 'Valid until date must be a valid date format',
        code: 'INVALID_VALID_UNTIL_DATE'
      }, { status: 400 });
    }

    // Validate numbers are positive
    if (parseFloat(subtotal) < 0) {
      return NextResponse.json({
        error: 'Subtotal must be a positive number',
        code: 'INVALID_SUBTOTAL'
      }, { status: 400 });
    }

    if (parseFloat(tax) < 0) {
      return NextResponse.json({
        error: 'Tax must be a positive number',
        code: 'INVALID_TAX'
      }, { status: 400 });
    }

    if (parseFloat(total) < 0) {
      return NextResponse.json({
        error: 'Total must be a positive number',
        code: 'INVALID_TOTAL'
      }, { status: 400 });
    }

    // Validate status
    if (!isValidStatus(status)) {
      return NextResponse.json({
        error: 'Status must be one of: draft, sent, accepted, rejected',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    // Generate or validate quote number
    let finalQuoteNumber = quoteNumber?.trim();
    if (!finalQuoteNumber) {
      finalQuoteNumber = generateQuoteNumber();
    }

    // Check if quote number is unique
    const existingQuote = await db
      .select()
      .from(quotes)
      .where(eq(quotes.quoteNumber, finalQuoteNumber))
      .limit(1);

    if (existingQuote.length > 0) {
      return NextResponse.json({
        error: 'Quote number already exists',
        code: 'DUPLICATE_QUOTE_NUMBER'
      }, { status: 400 });
    }

    // Create quote
    const now = new Date().toISOString();
    const newQuote = await db.insert(quotes)
      .values({
        companyId: companyIdInt,
        quoteNumber: finalQuoteNumber,
        issueDate,
        validUntilDate,
        subtotal: parseFloat(subtotal),
        tax: parseFloat(tax),
        total: parseFloat(total),
        notes: notes?.trim() || null,
        status,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json(newQuote[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const quoteId = parseInt(id);

    // Check if quote exists
    const existingQuote = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    if (existingQuote.length === 0) {
      return NextResponse.json({
        error: 'Quote not found',
        code: 'QUOTE_NOT_FOUND'
      }, { status: 404 });
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
      status
    } = body;

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Validate and update companyId if provided
    if (companyId !== undefined) {
      const companyIdInt = parseInt(companyId);
      if (isNaN(companyIdInt)) {
        return NextResponse.json({
          error: 'Company ID must be a valid integer',
          code: 'INVALID_COMPANY_ID'
        }, { status: 400 });
      }

      // Validate company exists
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyIdInt))
        .limit(1);

      if (company.length === 0) {
        return NextResponse.json({
          error: 'Company not found',
          code: 'COMPANY_NOT_FOUND'
        }, { status: 404 });
      }

      updates.companyId = companyIdInt;
    }

    // Validate and update issueDate if provided
    if (issueDate !== undefined) {
      if (!isValidDate(issueDate)) {
        return NextResponse.json({
          error: 'Issue date must be a valid date format',
          code: 'INVALID_ISSUE_DATE'
        }, { status: 400 });
      }
      updates.issueDate = issueDate;
    }

    // Validate and update validUntilDate if provided
    if (validUntilDate !== undefined) {
      if (!isValidDate(validUntilDate)) {
        return NextResponse.json({
          error: 'Valid until date must be a valid date format',
          code: 'INVALID_VALID_UNTIL_DATE'
        }, { status: 400 });
      }
      updates.validUntilDate = validUntilDate;
    }

    // Validate and update subtotal if provided
    if (subtotal !== undefined) {
      if (parseFloat(subtotal) < 0) {
        return NextResponse.json({
          error: 'Subtotal must be a positive number',
          code: 'INVALID_SUBTOTAL'
        }, { status: 400 });
      }
      updates.subtotal = parseFloat(subtotal);
    }

    // Validate and update tax if provided
    if (tax !== undefined) {
      if (parseFloat(tax) < 0) {
        return NextResponse.json({
          error: 'Tax must be a positive number',
          code: 'INVALID_TAX'
        }, { status: 400 });
      }
      updates.tax = parseFloat(tax);
    }

    // Validate and update total if provided
    if (total !== undefined) {
      if (parseFloat(total) < 0) {
        return NextResponse.json({
          error: 'Total must be a positive number',
          code: 'INVALID_TOTAL'
        }, { status: 400 });
      }
      updates.total = parseFloat(total);
    }

    // Update notes if provided
    if (notes !== undefined) {
      updates.notes = notes?.trim() || null;
    }

    // Validate and update status if provided
    if (status !== undefined) {
      if (!isValidStatus(status)) {
        return NextResponse.json({
          error: 'Status must be one of: draft, sent, accepted, rejected',
          code: 'INVALID_STATUS'
        }, { status: 400 });
      }
      updates.status = status;
    }

    // Update quote
    const updatedQuote = await db
      .update(quotes)
      .set(updates)
      .where(eq(quotes.id, quoteId))
      .returning();

    return NextResponse.json(updatedQuote[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const quoteId = parseInt(id);

    // Check if quote exists
    const existingQuote = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

    if (existingQuote.length === 0) {
      return NextResponse.json({
        error: 'Quote not found',
        code: 'QUOTE_NOT_FOUND'
      }, { status: 404 });
    }

    // Delete quote (cascade will delete quote_items automatically)
    const deleted = await db
      .delete(quotes)
      .where(eq(quotes.id, quoteId))
      .returning();

    return NextResponse.json({
      message: 'Quote deleted successfully',
      quote: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}