import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents, screenings } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import formidable, { Fields, Files, File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

// Helper function to convert NextRequest to Node.js readable stream
async function convertRequestToReadable(request: NextRequest): Promise<Readable> {
  const reader = request.body?.getReader();
  if (!reader) {
    throw new Error('Request body is not readable');
  }

  const readable = new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      } catch (error) {
        this.destroy(error as Error);
      }
    }
  });

  return readable;
}

// Helper function to parse multipart form data
async function parseForm(request: NextRequest): Promise<{ fields: Fields; files: Files }> {
  return new Promise(async (resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    try {
      const readable = await convertRequestToReadable(request);
      form.parse(readable as any, (err, fields, files) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ fields, files });
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const screeningId = params.id;

    // Validate screening ID
    if (!screeningId || isNaN(parseInt(screeningId))) {
      return NextResponse.json(
        { error: 'Valid screening ID is required', code: 'INVALID_SCREENING_ID' },
        { status: 400 }
      );
    }

    // Check if screening exists
    const screening = await db
      .select()
      .from(screenings)
      .where(eq(screenings.id, parseInt(screeningId)))
      .limit(1);

    if (screening.length === 0) {
      return NextResponse.json(
        { error: 'Screening not found', code: 'SCREENING_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get all documents for the screening
    const screeningDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.screeningId, parseInt(screeningId)))
      .orderBy(desc(documents.uploadDate));

    return NextResponse.json(screeningDocuments, { status: 200 });
  } catch (error) {
    console.error('GET documents error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const screeningId = params.id;

    // Validate screening ID
    if (!screeningId || isNaN(parseInt(screeningId))) {
      return NextResponse.json(
        { error: 'Valid screening ID is required', code: 'INVALID_SCREENING_ID' },
        { status: 400 }
      );
    }

    // Check if screening exists
    const screening = await db
      .select()
      .from(screenings)
      .where(eq(screenings.id, parseInt(screeningId)))
      .limit(1);

    if (screening.length === 0) {
      return NextResponse.json(
        { error: 'Screening not found', code: 'SCREENING_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Parse multipart form data
    let fields: formidable.Fields;
    let files: formidable.Files;

    try {
      const parsed = await parseForm(request);
      fields = parsed.fields;
      files = parsed.files;
    } catch (error) {
      console.error('Form parsing error:', error);
      if ((error as any).code === 'LIMIT_FILE_SIZE') {
        return NextResponse.json(
          { error: 'File size exceeds 10MB limit', code: 'FILE_TOO_LARGE' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to parse form data: ' + (error as Error).message, code: 'FORM_PARSE_ERROR' },
        { status: 400 }
      );
    }

    // Extract file from parsed data
    const fileArray = files.file;
    if (!fileArray || (Array.isArray(fileArray) && fileArray.length === 0)) {
      return NextResponse.json(
        { error: 'No file uploaded', code: 'NO_FILE_UPLOADED' },
        { status: 400 }
      );
    }

    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

    // Validate file type by extension
    const fileExtension = path.extname(file.originalFilename || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { 
          error: 'File type not allowed. Only PDF, DOCX, JPG, and PNG files are accepted', 
          code: 'INVALID_FILE_TYPE' 
        },
        { status: 400 }
      );
    }

    // Validate file type by MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype || '')) {
      return NextResponse.json(
        { 
          error: 'File type not allowed. Only PDF, DOCX, JPG, and PNG files are accepted', 
          code: 'INVALID_MIME_TYPE' 
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const originalFilename = file.originalFilename || 'unknown';
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${originalFilename}`;
    const destinationPath = path.join(UPLOAD_DIR, uniqueFilename);

    // Move file to destination
    try {
      fs.copyFileSync(file.filepath, destinationPath);
      // Clean up temporary file
      fs.unlinkSync(file.filepath);
    } catch (error) {
      console.error('File move error:', error);
      return NextResponse.json(
        { error: 'Failed to save file: ' + (error as Error).message, code: 'FILE_SAVE_ERROR' },
        { status: 500 }
      );
    }

    // Generate file URL
    const fileUrl = `/uploads/documents/${uniqueFilename}`;

    // Extract notes from form data
    const notesArray = fields.notes;
    const notes = notesArray ? (Array.isArray(notesArray) ? notesArray[0] : notesArray) : null;

    // Insert document into database
    const now = new Date().toISOString();
    const newDocument = await db
      .insert(documents)
      .values({
        screeningId: parseInt(screeningId),
        companyId: screening[0].companyId,
        title: originalFilename,
        description: notes || null,
        fileName: originalFilename,
        fileUrl,
        fileSize: file.size,
        fileType: file.mimetype || '',
        category: 'screening',
        uploadDate: now,
        uploadedBy: 'system',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newDocument[0], { status: 201 });
  } catch (error) {
    console.error('POST document error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}