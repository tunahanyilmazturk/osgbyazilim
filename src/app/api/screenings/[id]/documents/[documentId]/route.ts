import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const screeningId = params.id;
    const documentId = params.documentId;

    // Validate screening ID
    if (!screeningId || isNaN(parseInt(screeningId))) {
      return NextResponse.json(
        {
          error: 'Valid screening ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    // Validate document ID
    if (!documentId || isNaN(parseInt(documentId))) {
      return NextResponse.json(
        {
          error: 'Valid document ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const parsedScreeningId = parseInt(screeningId);
    const parsedDocumentId = parseInt(documentId);

    // Query document from database by document ID AND screening ID
    const existingDocument = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, parsedDocumentId),
          eq(documents.screeningId, parsedScreeningId)
        )
      )
      .limit(1);

    // Return 404 if document not found or doesn't belong to the screening
    if (existingDocument.length === 0) {
      return NextResponse.json(
        {
          error: 'Document not found or does not belong to this screening',
          code: 'DOCUMENT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const document = existingDocument[0];

    // Extract file path and delete file
    try {
      // Remove leading slash if present
      let fileUrl = document.fileUrl;
      if (fileUrl.startsWith('/')) {
        fileUrl = fileUrl.substring(1);
      }

      // Build full file path
      const filePath = path.join(process.cwd(), 'public', fileUrl);

      // Check if file exists and delete it
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      } else {
        console.warn(
          `File not found at ${filePath}, continuing with database deletion`
        );
      }
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete document record from database
    const deleted = await db
      .delete(documents)
      .where(eq(documents.id, parsedDocumentId))
      .returning();

    // Return success response
    return NextResponse.json(
      {
        message: 'Document deleted successfully',
        document: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}