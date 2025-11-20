/* eslint-disable jsx-a11y/alt-text */
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: { fontFamily: 'Roboto', fontSize: 10, padding: 40, backgroundColor: '#ffffff' },
  header: { marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  companyInfo: { flex: 1, marginBottom: 10 },
  logoContainer: { width: 80, height: 80, marginLeft: 15 },
  logoImage: { width: 80, height: 80, objectFit: 'contain' },
  companyName: { fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 5 },
  companyDetails: { fontSize: 9, color: '#4a4a4a', lineHeight: 1.4 },
  titleSection: { backgroundColor: '#eff6ff', padding: 12, marginBottom: 15, borderRadius: 4 },
  title: { fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 9, color: '#6b7280', fontWeight: 500 },
  value: { fontSize: 9, color: '#1a1a1a', fontWeight: 500 },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#1a1a1a', marginBottom: 10, paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: '#bfdbfe' },
  customerInfo: { backgroundColor: '#ffffff', padding: 12, borderRadius: 6, marginBottom: 15, borderWidth: 1, borderColor: '#e5e7eb', borderLeftWidth: 4, borderLeftColor: '#1d4ed8' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { width: '50%', marginBottom: 8 },
  infoItemFull: { width: '100%', marginBottom: 8 },
  infoLabel: { fontSize: 8, color: '#1e3a8a', marginBottom: 2, fontWeight: 500 },
  infoValue: { fontSize: 9, color: '#1a1a1a', fontWeight: 500 },
  table: { marginBottom: 15 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1d4ed8', padding: 8, fontWeight: 700, color: '#ffffff' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 4, paddingHorizontal: 8 },
  tableRowAlt: { backgroundColor: '#f9fafb' },
  colNo: { width: '8%', fontSize: 9 },
  colDescription: { width: '44%', fontSize: 9 },
  colQuantity: { width: '12%', fontSize: 9, textAlign: 'center' },
  colUnitPrice: { width: '18%', fontSize: 9, textAlign: 'right' },
  colTotal: { width: '18%', fontSize: 9, textAlign: 'right' },
  summarySection: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryCard: { width: '48%', backgroundColor: '#eff6ff', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  summaryHeader: { fontSize: 9, fontWeight: 700, color: '#1e3a8a', marginBottom: 6, textTransform: 'uppercase' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  summaryLabel: { fontSize: 10, color: '#4a4a4a', fontWeight: 500 },
  summaryValue: { fontSize: 10, color: '#1a1a1a', fontWeight: 500 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: '#1d4ed8' },
  totalLabel: { fontSize: 12, fontWeight: 700, color: '#1a1a1a' },
  totalValue: { fontSize: 12, fontWeight: 700, color: '#1a1a1a' },
  notesSection: { width: '48%', padding: 10, backgroundColor: '#f9fafb', borderRadius: 4 },
  notesTitle: { fontSize: 10, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 },
  notesText: { fontSize: 9, color: '#4a4a4a', lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#6b7280' },
  signatureSection: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  signatureBox: { width: '45%', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, padding: 8 },
  signatureLabel: { fontSize: 9, color: '#6b7280', marginBottom: 5, fontWeight: 500 },
  stampImage: { width: 60, height: 60, objectFit: 'contain', marginTop: 5 },
});

type QuoteItem = {
  id: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description: string;
  test: { id: number; name: string; code: string } | null;
};

type Quote = {
  id: number;
  quoteNumber: string;
  issueDate: string;
  validUntilDate: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  company: { name: string; address: string; contactPerson: string; phone: string; email: string };
  items: QuoteItem[];
};

export type QuoteCompanyInfo = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  stamp?: string;
  logo?: string;
};

export interface QuotePDFProps {
  quote: Quote;
  companyInfo?: QuoteCompanyInfo;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' TL';
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('tr-TR');

export const QuotePDF = ({ quote, companyInfo }: QuotePDFProps) => {
  const defaultCompanyInfo: Required<Pick<QuoteCompanyInfo, 'name' | 'address' | 'phone' | 'email'>> = {
    name: 'Çet-ka Körfez İş Sağlığı ve Güvenliği',
    address: 'Ömerağa Mah. Cemil Karakadılar Cad. No: 18/A İzmit Kocaeli',
    phone: '(262) 349 40 83 / 331 69 80',
    email: 'info@cetkaosgb.com',
  };
  const company = {
    ...defaultCompanyInfo,
    ...companyInfo,
  };

  const vatRate = quote.subtotal > 0 ? Math.round((quote.tax / quote.subtotal) * 100) : 0;

  return (
    <Document>
      {/* Page 1: Header, customer info, and offer description */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companyDetails}>{company.address}</Text>
            <Text style={styles.companyDetails}>Tel: {company.phone} | E-posta: {company.email}</Text>
          </View>
          {company.logo && (
            <View style={styles.logoContainer}>
              <Image src={company.logo} style={styles.logoImage} />
            </View>
          )}
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title}>FİYAT TEKLİFİ</Text>
          <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={styles.label}>TEKLİF NO:</Text>
              <Text style={styles.value}>{quote.quoteNumber}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={styles.label}>TARİH:</Text>
              <Text style={styles.value}>{formatDate(quote.issueDate)}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={styles.label}>GEÇERLİLİK TARİHİ:</Text>
              <Text style={styles.value}>{formatDate(quote.validUntilDate)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TEKLİF TALEBİNDE BULUNAN KURUMUN BİLGİLERİ (MÜŞTERİ)</Text>
          <View style={styles.customerInfo}>
            <View style={styles.infoGrid}>
              <View style={styles.infoItemFull}>
                <Text style={styles.infoLabel}>FİRMA ADI</Text>
                <Text style={styles.infoValue}>{quote.company.name}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>YETKİLİ KİŞİ</Text>
                <Text style={styles.infoValue}>{quote.company.contactPerson}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>TELEFON</Text>
                <Text style={styles.infoValue}>{quote.company.phone}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>E-POSTA</Text>
                <Text style={styles.infoValue}>{quote.company.email}</Text>
              </View>
              <View style={styles.infoItemFull}>
                <Text style={styles.infoLabel}>ADRES</Text>
                <Text style={styles.infoValue}>{quote.company.address}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TEKLİF HAKKINDA</Text>
          <Text style={styles.notesText}>
            {company.name} olarak iş sağlığı ve güvenliği alanında sunduğumuz hizmetler kapsamında, {quote.company.name} için talep edilen hizmetlere ilişkin aşağıdaki fiyat teklifini bilgilerinize sunarız.
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Text style={styles.footerText}>Bu teklif {formatDate(quote.validUntilDate)} tarihine kadar geçerlidir.</Text>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.footerText}>Sayfa 1/2</Text>
            </View>
          </View>
          <Text style={styles.footerText}> {company.name} - {company.email}</Text>
        </View>
      </Page>

      {/* Page 2: Offer details, summary, notes, and signatures */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TEKLİF DETAYLARI</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colNo}>SIRA NO</Text>
              <Text style={styles.colDescription}>TETKİK İSMİ</Text>
              <Text style={styles.colQuantity}>MİKTAR</Text>
              <Text style={styles.colUnitPrice}>BİRİM FİYATI</Text>
              <Text style={styles.colTotal}>TOPLAM</Text>
            </View>
            {quote.items.map((item, index) => (
              <View
                key={item.id}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={styles.colNo}>{index + 1}</Text>
                <Text style={styles.colDescription}>{item.test?.name || item.description}</Text>
                <Text style={styles.colQuantity}>{item.quantity}</Text>
                <Text style={styles.colUnitPrice}>{formatCurrency(item.unitPrice)}</Text>
                <Text style={styles.colTotal}>{formatCurrency(item.totalPrice)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.summarySection}>
          {quote.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>NOTLAR</Text>
              <Text style={styles.notesText}>{quote.notes}</Text>
            </View>
          )}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryHeader}>Özet</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ara Toplam:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(quote.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>KDV (%{vatRate}):</Text>
              <Text style={styles.summaryValue}>{formatCurrency(quote.tax)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GENEL TOPLAM:</Text>
              <Text style={styles.totalValue}>{formatCurrency(quote.total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.signatureSection} wrap={false}>
          <View style={styles.signatureBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.signatureLabel}>ONAY TARİHİ:</Text>
              <Text style={styles.signatureLabel}>___ / ___ / _____</Text>
            </View>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>YETKİLİ KİŞİ / FİRMA KAŞE & İMZA</Text>
            {company.stamp && <Image src={company.stamp} style={styles.stampImage} />}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Text style={styles.footerText}>Bu teklif {formatDate(quote.validUntilDate)} tarihine kadar geçerlidir.</Text>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.footerText}>Sayfa 2/2</Text>
            </View>
          </View>
          <Text style={styles.footerText}> {company.name} - {company.email}</Text>
        </View>
      </Page>
    </Document>
  );
};
