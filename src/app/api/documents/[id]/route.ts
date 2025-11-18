import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents, companies, screenings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const VALID_CATEGORIES = ['health_report', 'certificate', 'contract', 'identification', 'other'] as const;
const VALID_STATUSES = ['active', 'archived', 'expired'] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const result = await db
      .select({
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
        company: {
          id: companies.id,
          name: companies.name,
          contactPerson: companies.contactPerson,
        },
        screening: {
          id: screenings.id,
          date: screenings.date,
          type: screenings.type,
          status: screenings.status,
          participantName: screenings.participantName,
        },
      })
      .from(documents)
      .leftJoin(companies, eq(documents.companyId, companies.id))
      .leftJoin(screenings, eq(documents.screeningId, screenings.id))
      .where(eq(documents.id, parseInt(id)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Document not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0], { status: 200 });
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
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

    if (fileUrl !== undefined || fileName !== undefined || fileSize !== undefined || fileType !== undefined) {
      return NextResponse.json(
        {
          error: 'Cannot update immutable file properties',
          code: 'IMMUTABLE_FIELDS',
        },
        { status: 400 }
      );
    }

    const existingDocument = await db
      .select()
      .from(documents)
      .where(eq(documents.id, parseInt(id)))
      .limit(1);

    if (existingDocument.length === 0) {
      return NextResponse.json(
        { error: 'Document not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ 
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        code: "INVALID_CATEGORY" 
      }, { status: 400 });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

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

    const updates: any = {
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

    const updated = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, parseInt(id)))
      .returning();

    const result = await db
      .select({
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
        company: {
          id: companies.id,
          name: companies.name,
          contactPerson: companies.contactPerson,
        },
        screening: {
          id: screenings.id,
          date: screenings.date,
          type: screenings.type,
          status: screenings.status,
        },
      })
      .from(documents)
      .leftJoin(companies, eq(documents.companyId, companies.id))
      .leftJoin(screenings, eq(documents.screeningId, screenings.id))
      .where(eq(documents.id, parseInt(id)))
      .limit(1);

    return NextResponse.json(result[0], { status: 200 });
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const existingDocument = await db
      .select()
      .from(documents)
      .where(eq(documents.id, parseInt(id)))
      .limit(1);

    if (existingDocument.length === 0) {
      return NextResponse.json(
        { error: 'Document not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Soft delete
    const deleted = await db
      .update(documents)
      .set({
        status: 'archived',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(documents.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Document archived successfully',
        document: deleted[0],
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