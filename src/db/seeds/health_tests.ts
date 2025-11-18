import { db } from '@/db';
import { healthTests } from '@/db/schema';

async function main() {
    await db.delete(healthTests);
    
    const sampleHealthTests = [
        {
            name: 'EKG (Elektrokardiyogram)',
            description: 'Kalp elektriksel aktivitesinin ölçümü ve kalp ritim bozukluklarının tespiti',
            code: 'EKG-001',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Odyometri',
            description: 'İşitme kaybı ve işitme eşiğinin değerlendirilmesi için yapılan test',
            code: 'ODY-001',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Akciğer Grafisi',
            description: 'Göğüs kafesi ve akciğerlerin radyolojik görüntülemesi',
            code: 'XRY-001',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'SFT (Solunum Fonksiyon Testi)',
            description: 'Akciğer kapasitesi ve solunum fonksiyonlarının değerlendirilmesi',
            code: 'SFT-001',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Tam Kan Sayımı',
            description: 'Kan hücrelerinin sayısı ve oranlarının analizi',
            code: 'LAB-001',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Biyokimya Paneli',
            description: 'Karaciğer, böbrek fonksiyonları ve metabolik parametrelerin analizi',
            code: 'LAB-002',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'İdrar Tahlili',
            description: 'İdrar örneğinin fiziksel, kimyasal ve mikroskobik analizi',
            code: 'LAB-003',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Göz Muayenesi',
            description: 'Görme keskinliği, renk körlüğü ve göz sağlığı kontrolü',
            code: 'EYE-001',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Fizik Muayene',
            description: 'Genel sağlık durumu, vital bulgular ve sistem muayeneleri',
            code: 'PHY-001',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    ];

    await db.insert(healthTests).values(sampleHealthTests);
    
    console.log('✅ Health tests seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});