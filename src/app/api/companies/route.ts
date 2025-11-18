import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { companies } from '@/db/schema';
import { eq, like, or } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single company by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const company = await db.select()
        .from(companies)
        .where(eq(companies.id, parseInt(id)))
        .limit(1);

      if (company.length === 0) {
        return NextResponse.json({ 
          error: 'Company not found',
          code: 'COMPANY_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(company[0], { status: 200 });
    }

    // List companies with pagination and search
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');

    let query = db.select().from(companies);

    if (search) {
      query = query.where(
        or(
          like(companies.name, `%${search}%`),
          like(companies.contactPerson, `%${search}%`),
          like(companies.email, `%${search}%`)
        )
      );
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    logger.apiError('/api/companies', error, 500);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, address, contactPerson, phone, email } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ 
        error: "Address is required",
        code: "MISSING_ADDRESS" 
      }, { status: 400 });
    }

    if (!contactPerson) {
      return NextResponse.json({ 
        error: "Contact person is required",
        code: "MISSING_CONTACT_PERSON" 
      }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ 
        error: "Phone is required",
        code: "MISSING_PHONE" 
      }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ 
        error: "Email is required",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedData = {
      name: name.trim(),
      address: address.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      createdAt: new Date().toISOString()
    };

    const newCompany = await db.insert(companies)
      .values(sanitizedData)
      .returning();

    return NextResponse.json(newCompany[0], { status: 201 });
  } catch (error) {
    logger.apiError('/api/companies', error, 500);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
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

    // Check if company exists
    const existing = await db.select()
      .from(companies)
      .where(eq(companies.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND' 
      }, { status: 404 });
    }

    const body = await request.json();
    const { name, address, contactPerson, phone, email } = body;

    // Build update object with only provided fields
    const updates: Record<string, string> = {};

    if (name !== undefined) {
      updates.name = name.trim();
    }

    if (address !== undefined) {
      updates.address = address.trim();
    }

    if (contactPerson !== undefined) {
      updates.contactPerson = contactPerson.trim();
    }

    if (phone !== undefined) {
      updates.phone = phone.trim();
    }

    if (email !== undefined) {
      updates.email = email.trim().toLowerCase();
    }

    // Only proceed if there are fields to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ 
        error: "No fields provided for update",
        code: "NO_UPDATE_FIELDS" 
      }, { status: 400 });
    }

    const updated = await db.update(companies)
      .set(updates)
      .where(eq(companies.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    logger.apiError('/api/companies', error, 500);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
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

    // Check if company exists
    const existing = await db.select()
      .from(companies)
      .where(eq(companies.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Company not found',
        code: 'COMPANY_NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(companies)
      .where(eq(companies.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Company deleted successfully',
      company: deleted[0]
    }, { status: 200 });
  } catch (error) {
    logger.apiError('/api/companies', error, 500);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}