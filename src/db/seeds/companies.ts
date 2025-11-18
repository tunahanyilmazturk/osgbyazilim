import { db } from '@/db';
import { companies } from '@/db/schema';

async function main() {
    const sampleCompanies = [
        {
            name: 'Yılmaz İnşaat ve Taahhüt A.Ş.',
            address: 'Ankara Caddesi No:45 Çankaya/Ankara',
            contactPerson: 'Mehmet Yılmaz',
            phone: '+90 312 456 7890',
            email: 'info@yilmazinsaat.com.tr',
            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            name: 'Tekstil Plus Dokuma Sanayi Ltd. Şti.',
            address: 'Organize Sanayi Bölgesi 3. Cadde No:28 Bursa',
            contactPerson: 'Ayşe Demir',
            phone: '+90 224 789 1234',
            email: 'ademir@tekstilplus.com.tr',
            createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            name: 'Anadolu Makine İmalat San. ve Tic. A.Ş.',
            address: 'İstanbul Yolu 12. Km Eskişehir',
            contactPerson: 'Hasan Çelik',
            phone: '+90 222 345 6789',
            email: 'hcelik@anadolumakine.com.tr',
            createdAt: new Date(Date.now() - 240 * 24 * 60 * 60 * 1000).toISOString(),
        }
    ];

    await db.insert(companies).values(sampleCompanies);
    
    console.log('✅ Companies seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});