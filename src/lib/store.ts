"use client";

import { Company, Employee, HealthScreening, Appointment } from './types';

// Mock data store - in a real app, this would be connected to a database
export const mockCompanies: Company[] = [
  {
    id: '1',
    name: 'Acme İnşaat A.Ş.',
    address: 'Atatürk Cad. No:123, Ankara',
    contactPerson: 'Mehmet Yılmaz',
    phone: '0312 555 0001',
    email: 'info@acmeinsaat.com',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Güneş Tekstil Ltd.',
    address: 'Sanayi Bölgesi, Bursa',
    contactPerson: 'Ayşe Demir',
    phone: '0224 555 0002',
    email: 'contact@gunestekstil.com',
    createdAt: new Date('2024-02-20'),
  },
];

export const mockEmployees: Employee[] = [
  {
    id: '1',
    companyId: '1',
    firstName: 'Ahmet',
    lastName: 'Kaya',
    jobDescription: 'İnşaat Mühendisi',
    phone: '0532 555 0101',
    email: 'ahmet.kaya@acmeinsaat.com',
    tcNo: '12345678901',
    birthDate: new Date('1985-05-15'),
    createdAt: new Date('2024-01-20'),
  },
  {
    id: '2',
    companyId: '1',
    firstName: 'Fatma',
    lastName: 'Şahin',
    jobDescription: 'İş Güvenliği Uzmanı',
    phone: '0533 555 0102',
    email: 'fatma.sahin@acmeinsaat.com',
    tcNo: '12345678902',
    birthDate: new Date('1990-08-22'),
    createdAt: new Date('2024-01-22'),
  },
  {
    id: '3',
    companyId: '2',
    firstName: 'Ali',
    lastName: 'Yıldız',
    jobDescription: 'Tekstil Operatörü',
    phone: '0534 555 0103',
    email: 'ali.yildiz@gunestekstil.com',
    tcNo: '12345678903',
    birthDate: new Date('1988-03-10'),
    createdAt: new Date('2024-02-25'),
  },
];

export const mockScreenings: HealthScreening[] = [
  {
    id: '1',
    employeeId: '1',
    companyId: '1',
    date: new Date('2024-12-20'),
    time: '09:00',
    type: 'periodic',
    status: 'scheduled',
    notes: 'Yıllık periyodik muayene',
    createdAt: new Date('2024-12-01'),
  },
  {
    id: '2',
    employeeId: '2',
    companyId: '1',
    date: new Date('2024-12-20'),
    time: '10:00',
    type: 'periodic',
    status: 'scheduled',
    notes: 'Yıllık periyodik muayene',
    createdAt: new Date('2024-12-01'),
  },
  {
    id: '3',
    employeeId: '3',
    companyId: '2',
    date: new Date('2024-12-21'),
    time: '09:30',
    type: 'initial',
    status: 'scheduled',
    notes: 'İşe giriş muayenesi',
    createdAt: new Date('2024-12-05'),
  },
];

// Helper functions for data management
export const getCompanyById = (id: string): Company | undefined => {
  return mockCompanies.find(c => c.id === id);
};

export const getEmployeesByCompanyId = (companyId: string): Employee[] => {
  return mockEmployees.filter(e => e.companyId === companyId);
};

export const getScreeningsByDate = (date: Date): HealthScreening[] => {
  return mockScreenings.filter(s => 
    s.date.toDateString() === date.toDateString()
  );
};

export const getUpcomingScreenings = (limit: number = 5): HealthScreening[] => {
  const now = new Date();
  return mockScreenings
    .filter(s => s.date >= now && s.status === 'scheduled')
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);
};
