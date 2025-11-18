import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents, companies } from '@/db/schema';
import { eq, sql, and, gte, lt, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const nowISO = now.toISOString().split('T')[0];
    const thirtyDaysISO = thirtyDaysFromNow.toISOString().split('T')[0];
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    // Total documents
    const totalDocsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents);
    const totalDocuments = Number(totalDocsResult[0]?.count || 0);

    // Documents by status
    const statusResults = await db
      .select({ 
        status: documents.status,
        count: sql<number>`count(*)` 
      })
      .from(documents)
      .groupBy(documents.status);

    const activeDocuments = Number(statusResults.find(r => r.status === 'active')?.count || 0);
    const archivedDocuments = Number(statusResults.find(r => r.status === 'archived')?.count || 0);
    const expiredDocuments = Number(statusResults.find(r => r.status === 'expired')?.count || 0);

    // Documents by category
    const categoryResults = await db
      .select({ 
        category: documents.category,
        count: sql<number>`count(*)` 
      })
      .from(documents)
      .groupBy(documents.category);

    const documentsByCategory = {
      health_report: Number(categoryResults.find(r => r.category === 'health_report')?.count || 0),
      certificate: Number(categoryResults.find(r => r.category === 'certificate')?.count || 0),
      contract: Number(categoryResults.find(r => r.category === 'contract')?.count || 0),
      identification: Number(categoryResults.find(r => r.category === 'identification')?.count || 0),
      other: Number(categoryResults.find(r => r.category === 'other')?.count || 0),
    };

    // Expiring within 30 days
    const expiringResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(
        and(
          eq(documents.status, 'active'),
          sql`${documents.expiryDate} IS NOT NULL`,
          sql`${documents.expiryDate} >= ${nowISO}`,
          sql`${documents.expiryDate} <= ${thirtyDaysISO}`
        )
      );
    const expiringWithin30Days = Number(expiringResult[0]?.count || 0);

    // Already expired documents
    const expiredCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(
        and(
          sql`${documents.expiryDate} IS NOT NULL`,
          sql`${documents.expiryDate} < ${nowISO}`
        )
      );
    const expiredCount = Number(expiredCountResult[0]?.count || 0);

    // Documents by company
    const docsByCompanyRaw = await db
      .select({
        companyId: documents.companyId,
        companyName: companies.name,
        documentCount: sql<number>`count(${documents.id})`
      })
      .from(documents)
      .innerJoin(companies, eq(documents.companyId, companies.id))
      .groupBy(documents.companyId, companies.name)
      .orderBy(desc(sql<number>`count(${documents.id})`))
      .limit(10);

    const documentsByCompany = docsByCompanyRaw.map(row => ({
      companyId: row.companyId,
      companyName: row.companyName,
      documentCount: Number(row.documentCount)
    }));

    // Recent uploads
    const recentUploadsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(gte(documents.uploadDate, sevenDaysAgoISO));
    const recentUploads = Number(recentUploadsResult[0]?.count || 0);

    return NextResponse.json({
      totalDocuments,
      activeDocuments,
      archivedDocuments,
      expiredDocuments,
      documentsByCategory,
      expiringWithin30Days,
      expiredCount,
      documentsByCompany,
      recentUploads
    }, { status: 200 });

  } catch (error) {
    console.error('GET /api/documents/stats error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}