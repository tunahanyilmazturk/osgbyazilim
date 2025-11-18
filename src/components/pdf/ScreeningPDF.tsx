import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto',
    fontSize: 9,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
    borderBottomStyle: 'solid',
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  logoContainer: {
    width: 60,
    height: 60,
    marginLeft: 15,
  },
  logoImage: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderBottomStyle: 'solid',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '40%',
    fontSize: 8,
    color: '#666666',
    fontWeight: 400,
  },
  value: {
    width: '60%',
    fontSize: 8,
    color: '#1a1a1a',
    fontWeight: 400,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 700,
  },
  statusScheduled: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  statusCompleted: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  statusNoShow: {
    backgroundColor: '#ffedd5',
    color: '#9a3412',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridItem: {
    width: '48%',
  },
  employeeCard: {
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderRadius: 3,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid',
  },
  employeeName: {
    fontSize: 8,
    fontWeight: 700,
    marginBottom: 2,
    color: '#1f2937',
  },
  employeeDetails: {
    fontSize: 7,
    color: '#6b7280',
    marginBottom: 1,
  },
  testItem: {
    backgroundColor: '#fef3c7',
    padding: 4,
    borderRadius: 3,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderStyle: 'solid',
  },
  testName: {
    fontSize: 7,
    color: '#92400e',
  },
  notesBox: {
    backgroundColor: '#fef9e7',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fde68a',
    borderStyle: 'solid',
    fontStyle: 'italic',
    fontSize: 8,
    color: '#4b5563',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 7,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 10,
  },
  signatureSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  signatureBox: {
    width: '45%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 10,
    minHeight: 80,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 5,
    fontWeight: 500,
  },
  stampImage: {
    width: 70,
    height: 70,
    objectFit: 'contain',
    marginTop: 8,
  },
});

type ScreeningPDFProps = {
  screening: {
    id: number;
    date: string;
    timeStart: string;
    timeEnd: string;
    participantName: string;
    employeeCount: number;
    type: 'periodic' | 'initial' | 'special';
    status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
    notes: string | null;
    createdAt: string;
    assignedEmployees?: Array<{
      id: number;
      firstName: string;
      lastName: string;
      jobTitle: string;
      phone: string;
      email: string;
      specialization: string | null;
    }>;
    assignedTests?: Array<{
      id: number;
      name: string;
      code: string | null;
    }>;
  };
  company: {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
  };
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    stamp?: string;
    logo?: string;
  };
};

const ScreeningPDF: React.FC<ScreeningPDFProps> = ({ screening, company, companyInfo }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'scheduled':
        return styles.statusScheduled;
      case 'completed':
        return styles.statusCompleted;
      case 'cancelled':
        return styles.statusCancelled;
      case 'no-show':
        return styles.statusNoShow;
      default:
        return styles.statusScheduled;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Planlandı';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      case 'no-show':
        return 'Gelmedi';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'periodic':
        return 'Periyodik Muayene';
      case 'initial':
        return 'İşe Giriş Muayenesi';
      case 'special':
        return 'Özel Durum Muayenesi';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Randevu Detayları</Text>
            <Text style={styles.subtitle}>Sağlık Taraması Randevu Formu</Text>
          </View>
          {companyInfo?.logo && (
            <View style={styles.logoContainer}>
              <Image src={companyInfo.logo} style={styles.logoImage} />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Randevu Bilgileri</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Randevu No:</Text>
            <Text style={styles.value}>#{screening.id}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Durum:</Text>
            <View style={styles.value}>
              <Text style={[styles.statusBadge, getStatusStyle(screening.status)]}>
                {getStatusText(screening.status)}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tarih:</Text>
            <Text style={styles.value}>{formatDate(screening.date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Saat:</Text>
            <Text style={styles.value}>
              {screening.timeStart} - {screening.timeEnd}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Muayene Tipi:</Text>
            <Text style={styles.value}>{getTypeText(screening.type)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Firma Bilgileri</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Firma Adı:</Text>
            <Text style={styles.value}>{company.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Yetkili Kişi:</Text>
            <Text style={styles.value}>{company.contactPerson}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Telefon:</Text>
            <Text style={styles.value}>{company.phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>E-posta:</Text>
            <Text style={styles.value}>{company.email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Adres:</Text>
            <Text style={styles.value}>{company.address}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Katılımcı Bilgileri</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Katılımcı Adı:</Text>
            <Text style={styles.value}>{screening.participantName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Çalışan Sayısı:</Text>
            <Text style={styles.value}>{screening.employeeCount} kişi</Text>
          </View>
        </View>

        {screening.assignedTests && screening.assignedTests.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Yapılacak Sağlık Testleri ({screening.assignedTests.length})
              </Text>
              <View style={styles.gridContainer}>
                {screening.assignedTests.map((test) => (
                  <View key={test.id} style={[styles.testItem, styles.gridItem]}>
                    <Text style={styles.testName}>
                      • {test.name} {test.code && `(${test.code})`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {screening.notes && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notlar</Text>
              <View style={styles.notesBox}>
                <Text>{screening.notes}</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>ONAY / FİRMA KAŞE & İMZA</Text>
            {companyInfo?.stamp && (
              <Image src={companyInfo.stamp} style={styles.stampImage} />
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Oluşturulma Tarihi: {formatDateTime(screening.createdAt)} | Randevu No: #{screening.id}
          </Text>
          <Text style={{ marginTop: 3 }}>
            Bu belge otomatik olarak oluşturulmuştur.
          </Text>
        </View>
      </Page>

      {screening.assignedEmployees && screening.assignedEmployees.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Atanmış Personel</Text>
              <Text style={styles.subtitle}>Randevu #{screening.id} - {formatDate(screening.date)}</Text>
            </View>
            {companyInfo?.logo && (
              <View style={styles.logoContainer}>
                <Image src={companyInfo.logo} style={styles.logoImage} />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Atanmış Personel ({screening.assignedEmployees.length})
            </Text>
            <View style={styles.gridContainer}>
              {screening.assignedEmployees.map((emp) => (
                <View key={emp.id} style={[styles.employeeCard, styles.gridItem]}>
                  <Text style={styles.employeeName}>
                    {emp.firstName} {emp.lastName}
                  </Text>
                  <Text style={styles.employeeDetails}>Görev: {emp.jobTitle}</Text>
                  {emp.specialization && (
                    <Text style={styles.employeeDetails}>
                      Uzmanlık: {emp.specialization}
                    </Text>
                  )}
                  <Text style={styles.employeeDetails}>Tel: {emp.phone}</Text>
                  <Text style={styles.employeeDetails}>E-posta: {emp.email}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <Text>
              Sayfa 2 | Randevu No: #{screening.id}
            </Text>
          </View>
        </Page>
      )}
    </Document>
  );
};

export default ScreeningPDF;
