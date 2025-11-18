import { db } from '@/db';
import { activityLogs } from '@/db/schema';

async function main() {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Helper function to generate random date within business hours (08:00-18:00)
    const getRandomDate = (daysAgo: number) => {
        const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const hour = 8 + Math.floor(Math.random() * 10); // 08:00 to 18:00
        const minute = Math.floor(Math.random() * 60);
        date.setHours(hour, minute, 0, 0);
        return date.toISOString();
    };

    const sampleActivityLogs = [
        // User 1 (Admin - Ahmet Yılmaz) - 8 logs
        {
            userId: 1,
            action: 'login',
            resourceType: null,
            resourceId: null,
            details: null,
            ipAddress: '192.168.1.100',
            createdAt: getRandomDate(13),
        },
        {
            userId: 1,
            action: 'create_user',
            resourceType: 'user',
            resourceId: 6,
            details: JSON.stringify({ userName: 'Zeynep Arslan', role: 'user' }),
            ipAddress: '192.168.1.100',
            createdAt: getRandomDate(12),
        },
        {
            userId: 1,
            action: 'update_company',
            resourceType: 'company',
            resourceId: 3,
            details: JSON.stringify({ changes: { contactPerson: 'Ali Vural', phone: '+90 232 456 7890' } }),
            ipAddress: '192.168.1.100',
            createdAt: getRandomDate(11),
        },
        {
            userId: 1,
            action: 'login',
            resourceType: null,
            resourceId: null,
            details: null,
            ipAddress: '192.168.1.100',
            createdAt: getRandomDate(9),
        },
        {
            userId: 1,
            action: 'create_company',
            resourceType: 'company',
            resourceId: 8,
            details: JSON.stringify({ companyName: 'Yeni Holding A.Ş.', address: 'İstanbul' }),
            ipAddress: '192.168.1.100',
            createdAt: getRandomDate(8),
        },
        {
            userId: 1,
            action: 'update_user',
            resourceType: 'user',
            resourceId: 4,
            details: JSON.stringify({ changes: { role: 'manager' } }),
            ipAddress: '192.168.1.100',
            createdAt: getRandomDate(6),
        },
        {
            userId: 1,
            action: 'view_report',
            resourceType: 'report',
            resourceId: 5,
            details: JSON.stringify({ reportType: 'monthly_summary', period: '2024-01' }),
            ipAddress: '192.168.1.100',
            createdAt: getRandomDate(3),
        },
        {
            userId: 1,
            action: 'login',
            resourceType: null,
            resourceId: null,
            details: null,
            ipAddress: '192.168.1.100',
            createdAt: getRandomDate(1),
        },

        // User 2 (Manager - Ayşe Demir) - 6 logs
        {
            userId: 2,
            action: 'login',
            resourceType: null,
            resourceId: null,
            details: null,
            ipAddress: '192.168.1.101',
            createdAt: getRandomDate(13),
        },
        {
            userId: 2,
            action: 'update_screening',
            resourceType: 'screening',
            resourceId: 2,
            details: JSON.stringify({ changes: { status: 'completed', employeeCount: 45 } }),
            ipAddress: '192.168.1.101',
            createdAt: getRandomDate(10),
        },
        {
            userId: 2,
            action: 'view_report',
            resourceType: 'report',
            resourceId: 3,
            details: JSON.stringify({ reportType: 'screening_results', screeningId: 2 }),
            ipAddress: '192.168.1.101',
            createdAt: getRandomDate(10),
        },
        {
            userId: 2,
            action: 'login',
            resourceType: null,
            resourceId: null,
            details: null,
            ipAddress: '192.168.1.101',
            createdAt: getRandomDate(7),
        },
        {
            userId: 2,
            action: 'update_screening',
            resourceType: 'screening',
            resourceId: 5,
            details: JSON.stringify({ changes: { notes: 'Tüm çalışanlar tarandı, sonuçlar raporlandı' } }),
            ipAddress: '192.168.1.101',
            createdAt: getRandomDate(5),
        },
        {
            userId: 2,
            action: 'view_report',
            resourceType: 'report',
            resourceId: 7,
            details: JSON.stringify({ reportType: 'company_health_metrics', companyId: 1 }),
            ipAddress: '10.0.0.50',
            createdAt: getRandomDate(2),
        },

        // User 3 (Mehmet Kaya) - 5 logs
        {
            userId: 3,
            action: 'login',
            resourceType: null,
            resourceId: null,
            details: null,
            ipAddress: '192.168.1.102',
            createdAt: getRandomDate(12),
        },
        {
            userId: 3,
            action: 'create_screening',
            resourceType: 'screening',
            resourceId: 9,
            details: JSON.stringify({ companyName: 'ABC Tekstil', date: '2024-02-15', employeeCount: 30 }),
            ipAddress: '192.168.1.102',
            createdAt: getRandomDate(11),
        },
        {
            userId: 3,
            action: 'login',
            resourceType: null,
            resourceId: null,
            details: null,
            ipAddress: '192.168.1.102',
            createdAt: getRandomDate(8),
        },
        {
            userId: 3,
            action: 'update_screening',
            resourceType: 'screening',
            resourceId: 9,
            details: JSON.stringify({ changes: { timeStart: '09:00', timeEnd: '17:00' } }),
            ipAddress: '192.168.1.102',
            createdAt: getRandomDate(7),
        },
        {
            userId: 3,
            action: 'create_screening',
            resourceType: 'screening',
            resourceId: 10,
            details: JSON.stringify({ companyName: 'Demir İnşaat', date: '2024-02-20', employeeCount: 25 }),
            ipAddress: '10.0.0.51',
            createdAt: getRandomDate(4),
        },

        // User 4 (Fatma Şahin) - 4 logs
        {
            userId: 4,
            action: 'login',
            resourceType: null,
            resourceId: null,
            details: null,
            ipAddress: '192.168.1.103',
            createdAt: getRandomDate(10),
        },
        {
            userId: 4,
            action: 'view_report',
            resourceType: 'report',
            resourceId: 2,
            details: JSON.stringify({ reportType: 'screening_details', screeningId: 1 }),
            ipAddress: '192.168.1.103',
            createdAt: getRandomDate(9),
        },
        {
            userId: 4,
            action: 'login',
            resourceType: null,
            resourceId: null,
            details: null,
            ipAddress: '192.168.1.103',
            createdAt: getRandomDate(5),
        },
        {
            userId: 4,
            action: 'update_screening',
            resourceType: 'screening',
            resourceId: 4,
            details: JSON.stringify({ changes: { status: 'in_progress' } }),
            ipAddress: '10.0.0.52',
            createdAt: getRandomDate(3),
        },

        // User 5 (Can Özdemir) - 3 logs
        {
            userId: 5,
            action: 'login',
            resourceType: null,
            resourceId: null,
            details: null,
            ipAddress: '192.168.1.104',
            createdAt: getRandomDate(6),
        },
        {
            userId: 5,
            action: 'view_report',
            resourceType: 'report',
            resourceId: 4,
            details: JSON.stringify({ reportType: 'company_overview', companyId: 2 }),
            ipAddress: '192.168.1.104',
            createdAt: getRandomDate(6),
        },
        {
            userId: 5,
            action: 'login',
            resourceType: null,
            resourceId: null,
            details: null,
            ipAddress: '10.0.0.53',
            createdAt: getRandomDate(2),
        },

        // User 6 (Zeynep Arslan) - 2 logs
        {
            userId: 6,
            action: 'login',
            resourceType: null,
            resourceId: null,
            details: null,
            ipAddress: '192.168.1.105',
            createdAt: getRandomDate(4),
        },
        {
            userId: 6,
            action: 'view_report',
            resourceType: 'report',
            resourceId: 6,
            details: JSON.stringify({ reportType: 'personal_screenings', userId: 6 }),
            ipAddress: '192.168.1.105',
            createdAt: getRandomDate(3),
        },
    ];

    await db.insert(activityLogs).values(sampleActivityLogs);
    
    console.log('✅ Activity logs seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});