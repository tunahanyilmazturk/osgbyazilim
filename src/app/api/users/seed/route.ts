import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// WARNING: This endpoint is intended for local/development seeding only.
// It will deactivate all existing users and insert a predefined set of sample users.

async function handleSeed(request: NextRequest) {
  try {
    // Optional simple guard: require a query param seedKey to reduce accidental calls
    const seedKey = request.nextUrl.searchParams.get('key');
    if (process.env.NODE_ENV !== 'development' && seedKey !== 'ALLOW_SEED') {
      return NextResponse.json(
        { error: 'Seeding is only allowed in development or with correct key', code: 'SEED_NOT_ALLOWED' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    // Deactivate all existing users (soft delete)
    await db.update(users).set({ isActive: false, updatedAt: now }).where(eq(users.isActive, true));

    const passwordAdmin = await bcrypt.hash('Admin123!', 10);
    const passwordManager = await bcrypt.hash('Manager123!', 10);
    const passwordUser = await bcrypt.hash('User123!', 10);
    const passwordViewer = await bcrypt.hash('Viewer123!', 10);

    const sampleUsers = [
      // Admins / Managers
      {
        fullName: 'Sistem Yöneticisi',
        email: 'admin@example.com',
        passwordHash: passwordAdmin,
        role: 'admin' as const,
        department: 'Müdür',
        phone: '+90 555 000 0001',
      },
      {
        fullName: 'İSG Yöneticisi',
        email: 'manager@example.com',
        passwordHash: passwordManager,
        role: 'manager' as const,
        department: 'İş Güvenliği Uzmanı',
        phone: '+90 555 000 0002',
      },
      // Field roles as normal users
      {
        fullName: 'Laborant Kullanıcı',
        email: 'laborant@example.com',
        passwordHash: passwordUser,
        role: 'user' as const,
        department: 'Laborant',
        phone: '+90 555 000 0011',
      },
      {
        fullName: 'Radyoloji Teknikeri Kullanıcı',
        email: 'radyoloji@example.com',
        passwordHash: passwordUser,
        role: 'user' as const,
        department: 'Radyoloji Teknikeri',
        phone: '+90 555 000 0012',
      },
      {
        fullName: 'Odyometrist Kullanıcı',
        email: 'odyometrist@example.com',
        passwordHash: passwordUser,
        role: 'user' as const,
        department: 'Odyometrist',
        phone: '+90 555 000 0013',
      },
      {
        fullName: 'ATT Kullanıcı',
        email: 'att@example.com',
        passwordHash: passwordUser,
        role: 'user' as const,
        department: 'ATT',
        phone: '+90 555 000 0014',
      },
      {
        fullName: 'Hemşire Kullanıcı',
        email: 'hemsire@example.com',
        passwordHash: passwordUser,
        role: 'user' as const,
        department: 'Hemşire',
        phone: '+90 555 000 0015',
      },
      {
        fullName: 'İş Yeri Hekimi Kullanıcı',
        email: 'isyerihekimi@example.com',
        passwordHash: passwordUser,
        role: 'user' as const,
        department: 'İş Yeri Hekimi',
        phone: '+90 555 000 0016',
      },
      {
        fullName: 'İş Yeri Hemşiresi Kullanıcı',
        email: 'isyerihemsiresi@example.com',
        passwordHash: passwordUser,
        role: 'user' as const,
        department: 'İş Yeri Hemşiresi',
        phone: '+90 555 000 0017',
      },
      {
        fullName: 'Diğer Sağlık Personeli Kullanıcı',
        email: 'dsp@example.com',
        passwordHash: passwordUser,
        role: 'user' as const,
        department: 'Diğer Sağlık Personeli',
        phone: '+90 555 000 0018',
      },
      {
        fullName: 'Danışman Kullanıcı',
        email: 'danisman@example.com',
        passwordHash: passwordUser,
        role: 'user' as const,
        department: 'Danışman',
        phone: '+90 555 000 0019',
      },
      {
        fullName: 'Tıbbi Sekreter Kullanıcı',
        email: 'tibbisekreter@example.com',
        passwordHash: passwordUser,
        role: 'user' as const,
        department: 'Tıbbi Sekreter',
        phone: '+90 555 000 0020',
      },
      // Viewer example
      {
        fullName: 'Rapor Görüntüleyici',
        email: 'viewer@example.com',
        passwordHash: passwordViewer,
        role: 'viewer' as const,
        department: 'Yönetici',
        phone: '+90 555 000 0030',
      },
    ];

    const inserted = await db
      .insert(users)
      .values(
        sampleUsers.map((u) => ({
          fullName: u.fullName,
          email: u.email,
          passwordHash: u.passwordHash,
          role: u.role,
          phone: u.phone,
          department: u.department,
          avatarUrl: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: null,
        }))
      )
      .returning({ id: users.id, fullName: users.fullName, email: users.email, role: users.role, department: users.department });

    return NextResponse.json(
      {
        message: 'Sample users seeded successfully',
        count: inserted.length,
        users: inserted,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('USERS SEED error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleSeed(request);
}

export async function GET(request: NextRequest) {
  return handleSeed(request);
}
