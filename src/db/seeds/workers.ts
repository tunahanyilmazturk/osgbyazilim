import { db } from '@/db';
import { workers } from '@/db/schema';

async function main() {
    const sampleWorkers = [
        {
            firstName: 'Ahmet',
            lastName: 'Kaya',
            companyId: 1,
            jobDescription: 'İnşaat Mühendisi',
            phone: '+90 532 456 7890',
            email: 'ahmet.kaya@ozkonstruksiyon.com.tr',
            tcNo: '12345678901',
            createdAt: new Date('2024-02-15').toISOString(),
            updatedAt: new Date('2024-02-15').toISOString(),
        },
        {
            firstName: 'Fatma',
            lastName: 'Öztürk',
            companyId: 1,
            jobDescription: 'İş Güvenliği Uzmanı',
            phone: '+90 533 567 8901',
            email: 'fatma.ozturk@ozkonstruksiyon.com.tr',
            tcNo: '23456789012',
            createdAt: new Date('2024-03-20').toISOString(),
            updatedAt: new Date('2024-03-20').toISOString(),
        },
        {
            firstName: 'Zeynep',
            lastName: 'Aydın',
            companyId: 2,
            jobDescription: 'Tekstil Operatörü',
            phone: '+90 534 678 9012',
            email: 'zeynep.aydin@metroadateknoloji.com.tr',
            tcNo: '34567890123',
            createdAt: new Date('2024-04-10').toISOString(),
            updatedAt: new Date('2024-04-10').toISOString(),
        },
        {
            firstName: 'Mustafa',
            lastName: 'Şahin',
            companyId: 2,
            jobDescription: 'Kalite Kontrol Sorumlusu',
            phone: '+90 535 789 0123',
            email: 'mustafa.sahin@metroadateknoloji.com.tr',
            tcNo: '45678901234',
            createdAt: new Date('2024-05-05').toISOString(),
            updatedAt: new Date('2024-05-05').toISOString(),
        },
        {
            firstName: 'Ali',
            lastName: 'Yıldız',
            companyId: 3,
            jobDescription: 'Makine Operatörü',
            phone: '+90 536 890 1234',
            email: 'ali.yildiz@teknotekstil.com.tr',
            tcNo: '56789012345',
            createdAt: new Date('2024-06-12').toISOString(),
            updatedAt: new Date('2024-06-12').toISOString(),
        },
        {
            firstName: 'Elif',
            lastName: 'Arslan',
            companyId: 3,
            jobDescription: 'İşyeri Hemşiresi',
            phone: '+90 537 901 2345',
            email: 'elif.arslan@teknotekstil.com.tr',
            tcNo: '67890123456',
            createdAt: new Date('2024-07-18').toISOString(),
            updatedAt: new Date('2024-07-18').toISOString(),
        },
    ];

    await db.insert(workers).values(sampleWorkers);
    
    console.log('✅ Workers seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});