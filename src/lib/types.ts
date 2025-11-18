export interface Company {
  id: string;
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  createdAt: Date;
}

export interface Employee {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  jobDescription: string;
  phone: string;
  email: string;
  tcNo: string; // Turkish ID number
  birthDate: Date;
  createdAt: Date;
}

export interface HealthScreening {
  id: string;
  employeeId: string;
  companyId: string;
  date: Date;
  time: string;
  type: 'periodic' | 'initial' | 'special';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes: string;
  createdAt: Date;
}

export interface Appointment {
  id: string;
  screeningId: string;
  employeeId: string;
  companyId: string;
  date: Date;
  time: string;
  duration: number; // in minutes
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
}
