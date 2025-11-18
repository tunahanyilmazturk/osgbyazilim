import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Companies table
export const companies = sqliteTable('companies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  address: text('address').notNull(),
  contactPerson: text('contact_person').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  createdAt: text('created_at').notNull(),
});

// Screenings table - updated with time range and employee count
export const screenings = sqliteTable('screenings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  participantName: text('participant_name').notNull(),
  date: text('date').notNull(),
  timeStart: text('time_start').notNull(),
  timeEnd: text('time_end').notNull(),
  employeeCount: integer('employee_count').notNull(),
  type: text('type').notNull(),
  status: text('status').notNull().default('scheduled'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

// Notifications table
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  screeningId: integer('screening_id').references(() => screenings.id),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  scheduledFor: text('scheduled_for'),
});

// Screening Users junction table (many-to-many)
export const screeningUsers = sqliteTable('screening_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  screeningId: integer('screening_id').notNull().references(() => screenings.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedAt: text('assigned_at').notNull(),
});

// Add new companyWorkers table
export const companyWorkers = sqliteTable('company_workers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  tcNo: text('tc_no').notNull(),
  birthDate: text('birth_date').notNull(),
  gender: text('gender').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  jobTitle: text('job_title').notNull(),
  department: text('department'),
  bloodType: text('blood_type'),
  chronicDiseases: text('chronic_diseases'),
  allergies: text('allergies'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  startDate: text('start_date').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add new workerScreenings junction table
export const workerScreenings = sqliteTable('worker_screenings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workerId: integer('worker_id').notNull().references(() => companyWorkers.id, { onDelete: 'cascade' }),
  screeningId: integer('screening_id').notNull().references(() => screenings.id, { onDelete: 'cascade' }),
  result: text('result'),
  findings: text('findings'),
  recommendations: text('recommendations'),
  nextScreeningDate: text('next_screening_date'),
  createdAt: text('created_at').notNull(),
});

// Add new health_tests table
export const healthTests = sqliteTable('health_tests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  code: text('code'),
  price: real('price'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add new screening_tests junction table
export const screeningTests = sqliteTable('screening_tests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  screeningId: integer('screening_id').notNull().references(() => screenings.id, { onDelete: 'cascade' }),
  testId: integer('test_id').notNull().references(() => healthTests.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
});

// Add new company_tests junction table
export const companyTests = sqliteTable('company_tests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  testId: integer('test_id').notNull().references(() => healthTests.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
});

// Add quotes table at the end
export const quotes = sqliteTable('quotes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  quoteNumber: text('quote_number').notNull().unique(),
  issueDate: text('issue_date').notNull(),
  validUntilDate: text('valid_until_date').notNull(),
  subtotal: real('subtotal').notNull(),
  tax: real('tax').notNull(),
  total: real('total').notNull(),
  notes: text('notes'),
  status: text('status').notNull().default('draft'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add quote_items table
export const quoteItems = sqliteTable('quote_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  quoteId: integer('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  healthTestId: integer('health_test_id').references(() => healthTests.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
  description: text('description').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add new documents table - without employeeId
export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size'),
  fileType: text('file_type').notNull(),
  category: text('category').notNull(),
  companyId: integer('company_id').references(() => companies.id, { onDelete: 'set null' }),
  screeningId: integer('screening_id').references(() => screenings.id, { onDelete: 'set null' }),
  expiryDate: text('expiry_date'),
  uploadDate: text('upload_date').notNull(),
  uploadedBy: text('uploaded_by'),
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add users table at the end
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  department: text('department'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add activity logs table at the end
export const activityLogs = sqliteTable('activity_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: integer('resource_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull(),
});