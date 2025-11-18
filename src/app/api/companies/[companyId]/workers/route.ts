import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { companyWorkers, companies } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const companyId = params.companyId;
    const searchParams = request.nextUrl.searchParams;

    // Validate companyId
    if (!companyId || isNaN(parseInt(companyId))) {
      return NextResponse.json(
        { error: 'Valid company ID is required', code: 'INVALID_COMPANY_ID' },
        { status: 400 }
      );
    }

    const companyIdInt = parseInt(companyId);

    // Get query parameters
    const isActiveParam = searchParams.get('isActive');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Build query conditions
    const conditions = [eq(companyWorkers.companyId, companyIdInt)];

    if (isActiveParam !== null) {
      const isActive = isActiveParam === '1' || isActiveParam === 'true';
      conditions.push(eq(companyWorkers.isActive, isActive));
    }

    // Query workers
    const workers = await db
      .select()
      .from(companyWorkers)
      .where(and(...conditions))
      .orderBy(desc(companyWorkers.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(workers, { status: 200 });
  } catch (error) {
    console.error('GET workers error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const companyId = params.companyId;

    // Validate companyId
    if (!companyId || isNaN(parseInt(companyId))) {
      return NextResponse.json(
        { error: 'Valid company ID is required', code: 'INVALID_COMPANY_ID' },
        { status: 400 }
      );
    }

    const companyIdInt = parseInt(companyId);

    // Verify company exists
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyIdInt))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json(
        { error: 'Company not found', code: 'COMPANY_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      fullName,
      tcNo,
      birthDate,
      gender,
      phone,
      email,
      jobTitle,
      department,
      bloodType,
      chronicDiseases,
      allergies,
      emergencyContactName,
      emergencyContactPhone,
      startDate,
    } = body;

    // Validate required fields
    if (!fullName || fullName.trim() === '') {
      return NextResponse.json(
        { error: 'Full name is required', code: 'MISSING_FULL_NAME' },
        { status: 400 }
      );
    }

    if (!tcNo || tcNo.trim() === '') {
      return NextResponse.json(
        { error: 'TC number is required', code: 'MISSING_TC_NO' },
        { status: 400 }
      );
    }

    // Validate TC number format
    const tcNoTrimmed = tcNo.trim();
    if (!/^\d{11}$/.test(tcNoTrimmed)) {
      return NextResponse.json(
        { error: 'TC number must be exactly 11 digits', code: 'INVALID_TC_NO_FORMAT' },
        { status: 400 }
      );
    }

    // Check for duplicate TC number within same company
    const duplicateTc = await db
      .select()
      .from(companyWorkers)
      .where(
        and(
          eq(companyWorkers.companyId, companyIdInt),
          eq(companyWorkers.tcNo, tcNoTrimmed)
        )
      )
      .limit(1);

    if (duplicateTc.length > 0) {
      return NextResponse.json(
        { error: 'TC number already exists for another worker in this company', code: 'DUPLICATE_TC_NO' },
        { status: 409 }
      );
    }

    if (!birthDate || birthDate.trim() === '') {
      return NextResponse.json(
        { error: 'Birth date is required', code: 'MISSING_BIRTH_DATE' },
        { status: 400 }
      );
    }

    // Validate birth date format
    if (isNaN(Date.parse(birthDate))) {
      return NextResponse.json(
        { error: 'Birth date must be a valid ISO date format', code: 'INVALID_BIRTH_DATE_FORMAT' },
        { status: 400 }
      );
    }

    if (!gender || gender.trim() === '') {
      return NextResponse.json(
        { error: 'Gender is required', code: 'MISSING_GENDER' },
        { status: 400 }
      );
    }

    // Validate gender value
    const genderLower = gender.trim().toLowerCase();
    if (genderLower !== 'male' && genderLower !== 'female') {
      return NextResponse.json(
        { error: 'Gender must be either "male" or "female"', code: 'INVALID_GENDER' },
        { status: 400 }
      );
    }

    if (!phone || phone.trim() === '') {
      return NextResponse.json(
        { error: 'Phone is required', code: 'MISSING_PHONE' },
        { status: 400 }
      );
    }

    // Validate phone format
    const phoneTrimmed = phone.trim();
    if (phoneTrimmed.length < 10) {
      return NextResponse.json(
        { error: 'Phone must be at least 10 characters', code: 'INVALID_PHONE_LENGTH' },
        { status: 400 }
      );
    }

    if (!jobTitle || jobTitle.trim() === '') {
      return NextResponse.json(
        { error: 'Job title is required', code: 'MISSING_JOB_TITLE' },
        { status: 400 }
      );
    }

    if (!startDate || startDate.trim() === '') {
      return NextResponse.json(
        { error: 'Start date is required', code: 'MISSING_START_DATE' },
        { status: 400 }
      );
    }

    // Validate start date format
    if (isNaN(Date.parse(startDate))) {
      return NextResponse.json(
        { error: 'Start date must be a valid ISO date format', code: 'INVALID_START_DATE_FORMAT' },
        { status: 400 }
      );
    }

    // Validate email if provided
    if (email && email.trim() !== '') {
      const emailTrimmed = email.trim().toLowerCase();
      if (!emailTrimmed.includes('@') || !emailTrimmed.includes('.')) {
        return NextResponse.json(
          { error: 'Email must be a valid email address', code: 'INVALID_EMAIL_FORMAT' },
          { status: 400 }
        );
      }
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData: any = {
      companyId: companyIdInt,
      fullName: fullName.trim(),
      tcNo: tcNoTrimmed,
      birthDate: birthDate.trim(),
      gender: genderLower,
      phone: phoneTrimmed,
      jobTitle: jobTitle.trim(),
      startDate: startDate.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Add optional fields if provided
    if (email && email.trim() !== '') {
      insertData.email = email.trim().toLowerCase();
    }

    if (department && department.trim() !== '') {
      insertData.department = department.trim();
    }

    if (bloodType && bloodType.trim() !== '') {
      insertData.bloodType = bloodType.trim();
    }

    if (chronicDiseases && chronicDiseases.trim() !== '') {
      insertData.chronicDiseases = chronicDiseases.trim();
    }

    if (allergies && allergies.trim() !== '') {
      insertData.allergies = allergies.trim();
    }

    if (emergencyContactName && emergencyContactName.trim() !== '') {
      insertData.emergencyContactName = emergencyContactName.trim();
    }

    if (emergencyContactPhone && emergencyContactPhone.trim() !== '') {
      insertData.emergencyContactPhone = emergencyContactPhone.trim();
    }

    // Insert new worker
    const newWorker = await db
      .insert(companyWorkers)
      .values(insertData)
      .returning();

    return NextResponse.json(newWorker[0], { status: 201 });
  } catch (error) {
    console.error('POST worker error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}