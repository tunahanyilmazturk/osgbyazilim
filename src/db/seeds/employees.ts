import { db } from '@/db';
import { employees } from '@/db/schema';

async function main() {
    const sampleEmployees = [
        {
            firstName: 'Mehmet',
            lastName: 'Yılmaz',
            jobTitle: 'İş Yeri Hekimi',
            phone: '+90 532 456 7890',
            email: 'mehmet.yilmaz@osgb.com.tr',
            specialization: 'İş Sağlığı',
            createdAt: new Date('2024-03-15').toISOString(),
            updatedAt: new Date('2024-03-15').toISOString(),
        },
        {
            firstName: 'Ayşe',
            lastName: 'Demir',
            jobTitle: 'İSG Uzmanı',
            phone: '+90 533 234 5678',
            email: 'ayse.demir@osgb.com.tr',
            specialization: 'İş Sağlığı ve Güvenliği',
            createdAt: new Date('2024-04-20').toISOString(),
            updatedAt: new Date('2024-04-20').toISOString(),
        },
        {
            firstName: 'Ahmet',
            lastName: 'Çelik',
            jobTitle: 'Hemşire',
            phone: '+90 534 567 8901',
            email: 'ahmet.celik@osgb.com.tr',
            specialization: null,
            createdAt: new Date('2024-05-10').toISOString(),
            updatedAt: new Date('2024-05-10').toISOString(),
        },
        {
            firstName: 'Elif',
            lastName: 'Arslan',
            jobTitle: 'Laborant',
            phone: '+90 535 678 9012',
            email: 'elif.arslan@osgb.com.tr',
            specialization: 'Klinik Laboratuvar',
            createdAt: new Date('2024-06-05').toISOString(),
            updatedAt: new Date('2024-06-05').toISOString(),
        },
        {
            firstName: 'Mustafa',
            lastName: 'Kaya',
            jobTitle: 'Odyometrist',
            phone: '+90 536 789 0123',
            email: 'mustafa.kaya@osgb.com.tr',
            specialization: 'İşitme Testleri',
            createdAt: new Date('2024-07-12').toISOString(),
            updatedAt: new Date('2024-07-12').toISOString(),
        },
        {
            firstName: 'Zeynep',
            lastName: 'Öztürk',
            jobTitle: 'Radyoloji Teknikeri',
            phone: '+90 537 890 1234',
            email: 'zeynep.ozturk@osgb.com.tr',
            specialization: 'Radyolojik Tetkikler',
            createdAt: new Date('2024-08-18').toISOString(),
            updatedAt: new Date('2024-08-18').toISOString(),
        }
    ];

    await db.insert(employees).values(sampleEmployees);
    
    console.log('✅ Employees seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});