import { db } from '@/db';
import { notifications } from '@/db/schema';

async function main() {
    const sampleNotifications = [
        {
            type: 'upcoming_screening',
            title: 'Yaklaşan Sağlık Muayenesi',
            message: 'Fatma Öztürk için 28 Ocak 2025 tarihinde saat 11:00\'de periyodik sağlık muayenesi planlanmıştır.',
            screeningId: 4,
            employeeId: 2,
            isRead: 0,
            createdAt: '2025-01-18T09:00:00.000Z',
            scheduledFor: '2025-01-25T09:00:00.000Z',
        },
        {
            type: 'upcoming_screening',
            title: 'Sağlık Muayenesi Hatırlatması',
            message: 'Mustafa Şahin için 5 Şubat 2025 tarihinde saat 15:30\'da periyodik sağlık kontrolü planlanmıştır.',
            screeningId: 5,
            employeeId: 4,
            isRead: 0,
            createdAt: '2025-01-20T09:00:00.000Z',
            scheduledFor: '2025-02-02T09:00:00.000Z',
        },
        {
            type: 'screening_completed',
            title: 'Sağlık Muayenesi Tamamlandı',
            message: 'Ahmet Kaya\'nın 15 Kasım 2024 tarihli periyodik sağlık muayenesi tamamlanmıştır. Sonuçlar normal.',
            screeningId: 1,
            employeeId: 1,
            isRead: 1,
            createdAt: '2024-11-15T14:00:00.000Z',
            scheduledFor: null,
        },
        {
            type: 'upcoming_screening',
            title: 'İşe Giriş Muayenesi',
            message: 'Zeynep Aydın için 10 Şubat 2025 tarihinde saat 10:30\'da işe giriş sağlık muayenesi planlanmıştır.',
            screeningId: 2,
            employeeId: 3,
            isRead: 0,
            createdAt: '2025-01-22T09:00:00.000Z',
            scheduledFor: '2025-02-07T09:00:00.000Z',
        },
    ];

    await db.insert(notifications).values(sampleNotifications);
    
    console.log('✅ Notifications seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});