import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents, companies, screenings } from '@/db/schema';
import { eq, and, or, lte, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

const VALID_CATEGORIES = ['health_report', 'certificate', 'contract', 'identification', 'other'] as const;
const VALID_STATUSES = ['active', 'archived', 'expired'] as const;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single document by ID with JOINs
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const result = await db.select({
        id: documents.id,
        title: documents.title,
        description: documents.description,
        fileUrl: documents.fileUrl,
        fileName: documents.fileName,
        fileSize: documents.fileSize,
        fileType: documents.fileType,
        category: documents.category,
        companyId: documents.companyId,
        screeningId: documents.screeningId,
        expiryDate: documents.expiryDate,
        uploadDate: documents.uploadDate,
        uploadedBy: documents.uploadedBy,
        status: documents.status,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        companyName: companies.name,
        screeningDate: screenings.date,
        screeningType: screenings.type,
        screeningParticipant: screenings.participantName,
      })
      .from(documents)
      .leftJoin(companies, eq(documents.companyId, companies.id))
      .leftJoin(screenings, eq(documents.screeningId, screenings.id))
      .where(eq(documents.id, parseInt(id)))
      .limit(1);

      if (result.length === 0) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      return NextResponse.json(result[0]);
    }

    // List with filtering
    const category = searchParams.get('category');
    const companyId = searchParams.get('companyId');
    const screeningId = searchParams.get('screeningId');
    const status = searchParams.get('status');
    const expiringDays = searchParams.get('expiringDays');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    let query = db.select({
      id: documents.id,
      title: documents.title,
      description: documents.description,
      fileUrl: documents.fileUrl,
      fileName: documents.fileName,
      fileSize: documents.fileSize,
      fileType: documents.fileType,
      category: documents.category,
      companyId: documents.companyId,
      screeningId: documents.screeningId,
      expiryDate: documents.expiryDate,
      uploadDate: documents.uploadDate,
      uploadedBy: documents.uploadedBy,
      status: documents.status,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      companyName: companies.name,
      screeningDate: screenings.date,
      screeningType: screenings.type,
      screeningParticipant: screenings.participantName,
    })
    .from(documents)
    .leftJoin(companies, eq(documents.companyId, companies.id))
    .leftJoin(screenings, eq(documents.screeningId, screenings.id));

    const conditions = [];

    if (category) {
      if (!VALID_CATEGORIES.includes(category as any)) {
        return NextResponse.json({ 
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
          code: "INVALID_CATEGORY" 
        }, { status: 400 });
      }
      conditions.push(eq(documents.category, category));
    }

    if (companyId) {
      if (isNaN(parseInt(companyId))) {
        return NextResponse.json({ 
          error: "Invalid companyId",
          code: "INVALID_COMPANY_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(documents.companyId, parseInt(companyId)));
    }

    if (screeningId) {
      if (isNaN(parseInt(screeningId))) {
        return NextResponse.json({ 
          error: "Invalid screeningId",
          code: "INVALID_SCREENING_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(documents.screeningId, parseInt(screeningId)));
    }

    if (status) {
      if (!VALID_STATUSES.includes(status as any)) {
        return NextResponse.json({ 
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      conditions.push(eq(documents.status, status));
    }

    if (expiringDays) {
      const days = parseInt(expiringDays);
      if (isNaN(days) || days < 0) {
        return NextResponse.json({ 
          error: "Invalid expiringDays. Must be a positive number",
          code: "INVALID_EXPIRING_DAYS" 
        }, { status: 400 });
      }
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      conditions.push(
        and(
          sql`${documents.expiryDate} IS NOT NULL`,
          lte(documents.expiryDate, futureDate.toISOString().split('T')[0])
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    logger.apiError('/api/documents', error, 500);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      fileUrl, 
      fileName, 
      fileSize, 
      fileType, 
      category,
      companyId,
      screeningId,
      expiryDate,
      uploadedBy
    } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json({ 
        error: "Title is required",
        code: "MISSING_TITLE" 
      }, { status: 400 });
    }

    if (!fileUrl || !fileUrl.trim()) {
      return NextResponse.json({ 
        error: "File URL is required",
        code: "MISSING_FILE_URL" 
      }, { status: 400 });
    }

    if (!fileName || !fileName.trim()) {
      return NextResponse.json({ 
        error: "File name is required",
        code: "MISSING_FILE_NAME" 
      }, { status: 400 });
    }

    if (!fileType || !fileType.trim()) {
      return NextResponse.json({ 
        error: "File type is required",
        code: "MISSING_FILE_TYPE" 
      }, { status: 400 });
    }

    if (!category || !category.trim()) {
      return NextResponse.json({ 
        error: "Category is required",
        code: "MISSING_CATEGORY" 
      }, { status: 400 });
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ 
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        code: "INVALID_CATEGORY" 
      }, { status: 400 });
    }

    // Validate foreign keys if provided
    if (companyId) {
      const companyExists = await db.select({ id: companies.id })
        .from(companies)
        .where(eq(companies.id, parseInt(companyId)))
        .limit(1);
      
      if (companyExists.length === 0) {
        return NextResponse.json({ 
          error: "Company not found",
          code: "COMPANY_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    if (screeningId) {
      const screeningExists = await db.select({ id: screenings.id })
        .from(screenings)
        .where(eq(screenings.id, parseInt(screeningId)))
        .limit(1);
      
      if (screeningExists.length === 0) {
        return NextResponse.json({ 
          error: "Screening not found",
          code: "SCREENING_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    // Validate expiryDate format if provided
    if (expiryDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(expiryDate)) {
        return NextResponse.json({ 
          error: "Invalid expiryDate format. Must be ISO date format (YYYY-MM-DD)",
          code: "INVALID_EXPIRY_DATE" 
        }, { status: 400 });
      }
    }

    const now = new Date().toISOString();

    const newDocument = await db.insert(documents)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        fileUrl: fileUrl.trim(),
        fileName: fileName.trim(),
        fileSize: fileSize || null,
        fileType: fileType.trim(),
        category: category.trim(),
        companyId: companyId ? parseInt(companyId) : null,
        screeningId: screeningId ? parseInt(screeningId) : null,
        expiryDate: expiryDate || null,
        uploadDate: now,
        uploadedBy: uploadedBy?.trim() || null,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newDocument[0], { status: 201 });
  } catch (error) {
    logger.apiError('/api/documents', error, 500);
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

    const body = await request.json();
    const { 
      title, 
      description, 
      category,
      companyId,
      screeningId,
      expiryDate,
      uploadedBy,
      status,
      fileUrl,
      fileName,
      fileSize,
      fileType
    } = body;

    // Prevent updating immutable file properties
    if (fileUrl !== undefined || fileName !== undefined || fileSize !== undefined || fileType !== undefined) {
      return NextResponse.json({ 
        error: "Cannot update file properties (fileUrl, fileName, fileSize, fileType)",
        code: "IMMUTABLE_FIELDS" 
      }, { status: 400 });
    }

    // Check if document exists
    const existing = await db.select()
      .from(documents)
      .where(eq(documents.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ 
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        code: "INVALID_CATEGORY" 
      }, { status: 400 });
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Validate foreign keys if provided
    if (companyId !== undefined && companyId !== null) {
      const companyExists = await db.select({ id: companies.id })
        .from(companies)
        .where(eq(companies.id, parseInt(companyId)))
        .limit(1);
      
      if (companyExists.length === 0) {
        return NextResponse.json({ 
          error: "Company not found",
          code: "COMPANY_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    if (screeningId !== undefined && screeningId !== null) {
      const screeningExists = await db.select({ id: screenings.id })
        .from(screenings)
        .where(eq(screenings.id, parseInt(screeningId)))
        .limit(1);
      
      if (screeningExists.length === 0) {
        return NextResponse.json({ 
          error: "Screening not found",
          code: "SCREENING_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    // Validate expiryDate format if provided
    if (expiryDate !== undefined && expiryDate !== null) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(expiryDate)) {
        return NextResponse.json({ 
          error: "Invalid expiryDate format. Must be ISO date format (YYYY-MM-DD)",
          code: "INVALID_EXPIRY_DATE" 
        }, { status: 400 });
      }
    }

    const updates: Record<string, string | number | null> = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (category !== undefined) updates.category = category.trim();
    if (companyId !== undefined) updates.companyId = companyId ? parseInt(companyId) : null;
    if (screeningId !== undefined) updates.screeningId = screeningId ? parseInt(screeningId) : null;
    if (expiryDate !== undefined) updates.expiryDate = expiryDate || null;
    if (uploadedBy !== undefined) updates.uploadedBy = uploadedBy?.trim() || null;
    if (status !== undefined) updates.status = status.trim();

    const updated = await db.update(documents)
      .set(updates)
      .where(eq(documents.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    logger.apiError('/api/documents', error, 500);
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

    // Check if document exists
    const existing = await db.select()
      .from(documents)
      .where(eq(documents.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Soft delete by setting status to 'archived'
    const deleted = await db.update(documents)
      .set({
        status: 'archived',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(documents.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Document archived successfully',
      document: deleted[0]
    });
  } catch (error) {
    logger.apiError('/api/documents', error, 500);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}