import { db } from '@/db';
import { users } from '@/db/schema';
import bcrypt from 'bcryptjs';

async function main() {
    const passwordHash = await bcrypt.hash('123456', 10);
    
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const sixDaysAgo = new Date(now);
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    
    const adminLoginAt = new Date(now);
    adminLoginAt.setHours(8, 30, 0, 0);
    
    const managerLoginAt = new Date(yesterday);
    managerLoginAt.setHours(9, 15, 0, 0);
    
    const user1LoginAt = new Date(twoDaysAgo);
    user1LoginAt.setHours(10, 0, 0, 0);
    
    const user2LoginAt = new Date(threeDaysAgo);
    user2LoginAt.setHours(11, 30, 0, 0);
    
    const user3LoginAt = new Date(fiveDaysAgo);
    user3LoginAt.setHours(14, 45, 0, 0);
    
    const viewerLoginAt = new Date(sixDaysAgo);
    viewerLoginAt.setHours(13, 20, 0, 0);
    
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    const sampleUsers = [
        {
            fullName: 'Ahmet Yılmaz',
            email: 'admin@isgone.com.tr',
            passwordHash: passwordHash,
            role: 'admin',
            department: 'Yönetim',
            phone: '+90 532 123 4567',
            isActive: true,
            lastLoginAt: adminLoginAt.toISOString(),
            avatarUrl: null,
            createdAt: new Date(monthAgo.getTime()).toISOString(),
            updatedAt: new Date(monthAgo.getTime()).toISOString(),
        },
        {
            fullName: 'Ayşe Demir',
            email: 'ayse.demir@isgone.com.tr',
            passwordHash: passwordHash,
            role: 'manager',
            department: 'Sağlık Hizmetleri',
            phone: '+90 533 234 5678',
            isActive: true,
            lastLoginAt: managerLoginAt.toISOString(),
            avatarUrl: null,
            createdAt: new Date(monthAgo.getTime() + 86400000 * 2).toISOString(),
            updatedAt: new Date(monthAgo.getTime() + 86400000 * 2).toISOString(),
        },
        {
            fullName: 'Mehmet Kaya',
            email: 'mehmet.kaya@isgone.com.tr',
            passwordHash: passwordHash,
            role: 'user',
            department: 'İSG Uzmanı',
            phone: '+90 534 345 6789',
            isActive: true,
            lastLoginAt: user1LoginAt.toISOString(),
            avatarUrl: null,
            createdAt: new Date(monthAgo.getTime() + 86400000 * 5).toISOString(),
            updatedAt: new Date(monthAgo.getTime() + 86400000 * 5).toISOString(),
        },
        {
            fullName: 'Fatma Şahin',
            email: 'fatma.sahin@isgone.com.tr',
            passwordHash: passwordHash,
            role: 'user',
            department: 'İş Yeri Hemşiresi',
            phone: '+90 535 456 7890',
            isActive: true,
            lastLoginAt: user2LoginAt.toISOString(),
            avatarUrl: null,
            createdAt: new Date(monthAgo.getTime() + 86400000 * 8).toISOString(),
            updatedAt: new Date(monthAgo.getTime() + 86400000 * 8).toISOString(),
        },
        {
            fullName: 'Can Özdemir',
            email: 'can.ozdemir@isgone.com.tr',
            passwordHash: passwordHash,
            role: 'user',
            department: 'İSG Teknisyeni',
            phone: '+90 536 567 8901',
            isActive: true,
            lastLoginAt: user3LoginAt.toISOString(),
            avatarUrl: null,
            createdAt: new Date(monthAgo.getTime() + 86400000 * 12).toISOString(),
            updatedAt: new Date(monthAgo.getTime() + 86400000 * 12).toISOString(),
        },
        {
            fullName: 'Zeynep Arslan',
            email: 'zeynep.arslan@isgone.com.tr',
            passwordHash: passwordHash,
            role: 'viewer',
            department: 'Muhasebe',
            phone: '+90 537 678 9012',
            isActive: true,
            lastLoginAt: viewerLoginAt.toISOString(),
            avatarUrl: null,
            createdAt: new Date(monthAgo.getTime() + 86400000 * 15).toISOString(),
            updatedAt: new Date(monthAgo.getTime() + 86400000 * 15).toISOString(),
        }
    ];

    await db.insert(users).values(sampleUsers);
    
    console.log('✅ Users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});