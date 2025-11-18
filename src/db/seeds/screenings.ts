import { db } from '@/db';
import { screenings } from '@/db/schema';

async function main() {
    const sampleScreenings = [
        {
            workerId: 1,
            companyId: 1,
            date: '2024-01-15',
            time: '09:00',
            type: 'initial',
            status: 'completed',
            notes: 'Yeni işe giriş muayenesi tamamlandı. İşe başlamaya uygun.',
            createdAt: new Date('2024-01-10').toISOString(),
        },
        {
            workerId: 2,
            companyId: 1,
            date: '2024-02-20',
            time: '10:30',
            type: 'periodic',
            status: 'completed',
            notes: '6 aylık periyodik kontrol yapıldı. Sağlık durumu iyi.',
            createdAt: new Date('2024-02-15').toISOString(),
        },
        {
            workerId: 3,
            companyId: 2,
            date: '2024-03-10',
            time: '14:00',
            type: 'periodic',
            status: 'cancelled',
            notes: 'Çalışan izinli olduğu için iptal edildi. Yeni tarih belirlenecek.',
            createdAt: new Date('2024-03-05').toISOString(),
        },
        {
            workerId: 4,
            companyId: 2,
            date: '2024-12-25',
            time: '09:30',
            type: 'special',
            status: 'scheduled',
            notes: 'İş kazası sonrası kontrol muayenesi planlandı.',
            createdAt: new Date('2024-12-20').toISOString(),
        },
        {
            workerId: 5,
            companyId: 3,
            date: '2024-12-28',
            time: '15:30',
            type: 'periodic',
            status: 'scheduled',
            notes: 'Yıllık periyodik sağlık muayenesi. Laboratuvar testleri dahil.',
            createdAt: new Date('2024-12-18').toISOString(),
        }
    ];

    await db.insert(screenings).values(sampleScreenings);
    
    console.log('✅ Screenings seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});