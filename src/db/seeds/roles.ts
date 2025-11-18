import { db } from '@/db';
import { roles } from '@/db/schema';

async function main() {
    const sampleRoles = [
        {
            name: 'OSGB Müdürü',
            description: 'OSGB Director who manages the entire health and safety center',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Tarama Şefi',
            description: 'Screening Chief responsible for overseeing health screenings',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Hasta Kabul',
            description: 'Patient Reception staff who handle patient intake and scheduling',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'İdari Personel',
            description: 'Administrative Staff who manage paperwork and office duties',
            createdAt: new Date().toISOString(),
        },
        {
            name: 'Kalite Yöneticisi',
            description: 'Quality Manager responsible for quality assurance and compliance',
            createdAt: new Date().toISOString(),
        }
    ];

    await db.insert(roles).values(sampleRoles);
    
    console.log('✅ Roles seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});