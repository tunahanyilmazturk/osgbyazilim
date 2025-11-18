import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { companyWorkers } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string; workerId: string } }
) {
  try {
    const { companyId, workerId } = params;

    // Validate companyId and workerId are valid integers
    if (!companyId || isNaN(parseInt(companyId))) {
      return NextResponse.json(
        { error: 'Valid company ID is required', code: 'INVALID_COMPANY_ID' },
        { status: 400 }
      );
    }

    if (!workerId || isNaN(parseInt(workerId))) {
      return NextResponse.json(
        { error: 'Valid worker ID is required', code: 'INVALID_WORKER_ID' },
        { status: 400 }
      );
    }

    const companyIdInt = parseInt(companyId);
    const workerIdInt = parseInt(workerId);

    // Get worker and verify it belongs to the specified company
    const worker = await db
      .select()
      .from(companyWorkers)
      .where(
        and(
          eq(companyWorkers.id, workerIdInt),
          eq(companyWorkers.companyId, companyIdInt)
        )
      )
      .limit(1);

    if (worker.length === 0) {
      return NextResponse.json(
        { error: 'Worker not found or does not belong to this company', code: 'WORKER_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(worker[0], { status: 200 });
  } catch (error) {
    console.error('GET worker error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { companyId: string; workerId: string } }
) {
  try {
    const { companyId, workerId } = params;

    // Validate companyId and workerId are valid integers
    if (!companyId || isNaN(parseInt(companyId))) {
      return NextResponse.json(
        { error: 'Valid company ID is required', code: 'INVALID_COMPANY_ID' },
        { status: 400 }
      );
    }

    if (!workerId || isNaN(parseInt(workerId))) {
      return NextResponse.json(
        { error: 'Valid worker ID is required', code: 'INVALID_WORKER_ID' },
        { status: 400 }
      );
    }

    const companyIdInt = parseInt(companyId);
    const workerIdInt = parseInt(workerId);

    // Verify worker exists and belongs to the specified company
    const existingWorker = await db
      .select()
      .from(companyWorkers)
      .where(
        and(
          eq(companyWorkers.id, workerIdInt),
          eq(companyWorkers.companyId, companyIdInt)
        )
      )
      .limit(1);

    if (existingWorker.length === 0) {
      return NextResponse.json(
        { error: 'Worker not found or does not belong to this company', code: 'WORKER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Prevent updating protected fields
    if ('id' in body || 'companyId' in body || 'createdAt' in body) {
      return NextResponse.json(
        { error: 'Cannot update protected fields (id, companyId, createdAt)', code: 'PROTECTED_FIELDS' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {};

    // Validate and process each field if provided
    if ('fullName' in body) {
      const fullName = body.fullName?.trim();
      if (!fullName) {
        return NextResponse.json(
          { error: 'Full name cannot be empty', code: 'INVALID_FULL_NAME' },
          { status: 400 }
        );
      }
      updates.fullName = fullName;
    }

    if ('tcNo' in body) {
      const tcNo = body.tcNo?.trim();
      if (!tcNo) {
        return NextResponse.json(
          { error: 'TC number cannot be empty', code: 'INVALID_TC_NO' },
          { status: 400 }
        );
      }
      if (!/^\d{11}$/.test(tcNo)) {
        return NextResponse.json(
          { error: 'TC number must be exactly 11 digits', code: 'INVALID_TC_NO_FORMAT' },
          { status: 400 }
        );
      }

      // Check for duplicate TC number within same company (excluding current worker)
      const duplicateTc = await db
        .select()
        .from(companyWorkers)
        .where(
          and(
            eq(companyWorkers.companyId, companyIdInt),
            eq(companyWorkers.tcNo, tcNo),
            ne(companyWorkers.id, workerIdInt)
          )
        )
        .limit(1);

      if (duplicateTc.length > 0) {
        return NextResponse.json(
          { error: 'TC number already exists for another worker in this company', code: 'DUPLICATE_TC_NO' },
          { status: 409 }
        );
      }

      updates.tcNo = tcNo;
    }

    if ('birthDate' in body) {
      const birthDate = body.birthDate?.trim();
      if (!birthDate) {
        return NextResponse.json(
          { error: 'Birth date cannot be empty', code: 'INVALID_BIRTH_DATE' },
          { status: 400 }
        );
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!dateRegex.test(birthDate) && isNaN(Date.parse(birthDate))) {
        return NextResponse.json(
          { error: 'Birth date must be a valid ISO date format', code: 'INVALID_BIRTH_DATE_FORMAT' },
          { status: 400 }
        );
      }
      updates.birthDate = birthDate;
    }

    if ('gender' in body) {
      const gender = body.gender?.trim().toLowerCase();
      if (!gender) {
        return NextResponse.json(
          { error: 'Gender cannot be empty', code: 'INVALID_GENDER' },
          { status: 400 }
        );
      }
      if (gender !== 'male' && gender !== 'female') {
        return NextResponse.json(
          { error: 'Gender must be either "male" or "female"', code: 'INVALID_GENDER_VALUE' },
          { status: 400 }
        );
      }
      updates.gender = gender;
    }

    if ('phone' in body) {
      const phone = body.phone?.trim();
      if (!phone) {
        return NextResponse.json(
          { error: 'Phone cannot be empty', code: 'INVALID_PHONE' },
          { status: 400 }
        );
      }
      if (phone.length < 10) {
        return NextResponse.json(
          { error: 'Phone must be at least 10 characters', code: 'INVALID_PHONE_LENGTH' },
          { status: 400 }
        );
      }
      updates.phone = phone;
    }

    if ('email' in body) {
      if (body.email !== null && body.email !== undefined && body.email !== '') {
        const email = body.email.trim().toLowerCase();
        if (!email.includes('@') || !email.includes('.')) {
          return NextResponse.json(
            { error: 'Email must be a valid email address', code: 'INVALID_EMAIL_FORMAT' },
            { status: 400 }
          );
        }
        updates.email = email;
      } else {
        updates.email = null;
      }
    }

    if ('jobTitle' in body) {
      const jobTitle = body.jobTitle?.trim();
      if (!jobTitle) {
        return NextResponse.json(
          { error: 'Job title cannot be empty', code: 'INVALID_JOB_TITLE' },
          { status: 400 }
        );
      }
      updates.jobTitle = jobTitle;
    }

    if ('department' in body) {
      updates.department = body.department ? body.department.trim() : null;
    }

    if ('bloodType' in body) {
      updates.bloodType = body.bloodType ? body.bloodType.trim() : null;
    }

    if ('chronicDiseases' in body) {
      updates.chronicDiseases = body.chronicDiseases ? body.chronicDiseases.trim() : null;
    }

    if ('allergies' in body) {
      updates.allergies = body.allergies ? body.allergies.trim() : null;
    }

    if ('emergencyContactName' in body) {
      updates.emergencyContactName = body.emergencyContactName ? body.emergencyContactName.trim() : null;
    }

    if ('emergencyContactPhone' in body) {
      updates.emergencyContactPhone = body.emergencyContactPhone ? body.emergencyContactPhone.trim() : null;
    }

    if ('startDate' in body) {
      const startDate = body.startDate?.trim();
      if (!startDate) {
        return NextResponse.json(
          { error: 'Start date cannot be empty', code: 'INVALID_START_DATE' },
          { status: 400 }
        );
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
      if (!dateRegex.test(startDate) && isNaN(Date.parse(startDate))) {
        return NextResponse.json(
          { error: 'Start date must be a valid ISO date format', code: 'INVALID_START_DATE_FORMAT' },
          { status: 400 }
        );
      }
      updates.startDate = startDate;
    }

    if ('isActive' in body) {
      if (typeof body.isActive !== 'boolean') {
        return NextResponse.json(
          { error: 'isActive must be a boolean value', code: 'INVALID_IS_ACTIVE' },
          { status: 400 }
        );
      }
      updates.isActive = body.isActive;
    }

    // If no valid fields to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update', code: 'NO_UPDATE_FIELDS' },
        { status: 400 }
      );
    }

    // Always update updatedAt
    updates.updatedAt = new Date().toISOString();

    // Update worker
    const updatedWorker = await db
      .update(companyWorkers)
      .set(updates)
      .where(
        and(
          eq(companyWorkers.id, workerIdInt),
          eq(companyWorkers.companyId, companyIdInt)
        )
      )
      .returning();

    if (updatedWorker.length === 0) {
      return NextResponse.json(
        { error: 'Worker not found or does not belong to this company', code: 'WORKER_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedWorker[0], { status: 200 });
  } catch (error) {
    console.error('PATCH worker error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string; workerId: string } }
) {
  try {
    const { companyId, workerId } = params;

    // Validate companyId and workerId are valid integers
    if (!companyId || isNaN(parseInt(companyId))) {
      return NextResponse.json(
        { error: 'Valid company ID is required', code: 'INVALID_COMPANY_ID' },
        { status: 400 }
      );
    }

    if (!workerId || isNaN(parseInt(workerId))) {
      return NextResponse.json(
        { error: 'Valid worker ID is required', code: 'INVALID_WORKER_ID' },
        { status: 400 }
      );
    }

    const companyIdInt = parseInt(companyId);
    const workerIdInt = parseInt(workerId);

    // Verify worker exists and belongs to the specified company
    const existingWorker = await db
      .select()
      .from(companyWorkers)
      .where(
        and(
          eq(companyWorkers.id, workerIdInt),
          eq(companyWorkers.companyId, companyIdInt)
        )
      )
      .limit(1);

    if (existingWorker.length === 0) {
      return NextResponse.json(
        { error: 'Worker not found or does not belong to this company', code: 'WORKER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    const deletedWorker = await db
      .update(companyWorkers)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString()
      })
      .where(
        and(
          eq(companyWorkers.id, workerIdInt),
          eq(companyWorkers.companyId, companyIdInt)
        )
      )
      .returning();

    if (deletedWorker.length === 0) {
      return NextResponse.json(
        { error: 'Worker not found or does not belong to this company', code: 'WORKER_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Worker successfully deactivated',
        worker: deletedWorker[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE worker error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}