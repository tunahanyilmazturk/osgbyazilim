import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { screenings, screeningUsers, users, companies, companyWorkers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendScreeningNotificationEmail } from '@/lib/email/send-screening-notification';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Geçerli bir randevu ID gerekli' },
        { status: 400 }
      );
    }

    const screeningId = parseInt(id);
    const body = await request.json().catch(() => ({}));
    const subject = typeof body.subject === 'string' && body.subject.trim().length > 0
      ? body.subject.trim()
      : undefined;
    const extraMessage = typeof body.message === 'string' && body.message.trim().length > 0
      ? body.message.trim()
      : undefined;

    // Fetch screening
    const screeningResult = await db
      .select()
      .from(screenings)
      .where(eq(screenings.id, screeningId))
      .limit(1);

    if (screeningResult.length === 0) {
      return NextResponse.json(
        { error: 'Randevu bulunamadı' },
        { status: 404 }
      );
    }

    const screening = screeningResult[0];

    // Fetch assigned users with emails
    const assignedUsersResult = await db
      .select({
        email: users.email,
        fullName: users.fullName,
      })
      .from(screeningUsers)
      .innerJoin(users, eq(screeningUsers.userId, users.id))
      .where(eq(screeningUsers.screeningId, screeningId));

    const recipients = Array.from(
      new Set(
        assignedUsersResult
          .map((user) => user.email)
          .filter((email): email is string => Boolean(email && email.includes('@')))
      )
    );

    // Fetch company as fallback & gather personnel emails
    const companyResult = await db
      .select()
      .from(companies)
      .where(eq(companies.id, screening.companyId))
      .limit(1);

    const companyWorkerEmails = await db
      .select({ email: companyWorkers.email })
      .from(companyWorkers)
      .where(eq(companyWorkers.companyId, screening.companyId));

    for (const worker of companyWorkerEmails) {
      if (worker.email && worker.email.includes('@')) {
        recipients.push(worker.email);
      }
    }

    if (recipients.length === 0 && companyResult.length === 0) {
      return NextResponse.json(
        { error: 'Bu randevu için e-posta gönderilebilecek kişi bulunamadı' },
        { status: 400 }
      );
    }

    if (recipients.length === 0 && companyResult[0].email) {
      recipients.push(companyResult[0].email);
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'Geçerli e-posta adresi bulunamadı' },
        { status: 400 }
      );
    }

    await sendScreeningNotificationEmail({
      recipients,
      subject,
      companyName: companyResult[0]?.name || 'OSGB',
      companyContact: companyResult[0]?.contactPerson,
      extraMessage,
      screening: {
        id: screening.id,
        date: screening.date,
        timeStart: screening.timeStart,
        timeEnd: screening.timeEnd,
        type: screening.type,
        participantName: screening.participantName,
        notes: screening.notes,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending screening email:', error);
    const message = error instanceof Error ? error.message : 'E-posta gönderilirken hata oluştu';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
