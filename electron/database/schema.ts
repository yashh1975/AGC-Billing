import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ─── Company Profile ────────────────────────────────────────────────
export const companyProfile = sqliteTable('company_profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  businessName: text('business_name').notNull(),
  legalName: text('legal_name'),
  gstin: text('gstin'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  stateCode: text('state_code'),
  pincode: text('pincode'),
  phone: text('phone'),
  email: text('email'),
  logoPath: text('logo_path'),
  bankName: text('bank_name'),
  bankAccountName: text('bank_account_name'),
  bankAccountNumber: text('bank_account_number'),
  bankIfsc: text('bank_ifsc'),
  bankBranch: text('bank_branch'),
  signaturePath: text('signature_path'),
  invoiceFooter: text('invoice_footer'),
  termsSales: text('terms_sales'),
  termsService: text('terms_service'),
  termsPurchase: text('terms_purchase'),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
  updatedAt: text('updated_at').notNull().default('(datetime(\'now\'))'),
});

// ─── Users ──────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().default('user'), // admin | user
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastLogin: text('last_login'),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
  updatedAt: text('updated_at').notNull().default('(datetime(\'now\'))'),
});

// ─── Financial Years ────────────────────────────────────────────────
export const financialYears = sqliteTable('financial_years', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),            // "2026-27"
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
});

// ─── Customers ──────────────────────────────────────────────────────
export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  referenceNumber: text('reference_number').notNull().unique(), // AGC-CUS-0001
  name: text('name').notNull(),
  mobile: text('mobile'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  stateCode: text('state_code'),
  gstin: text('gstin'),
  placeOfSupply: text('place_of_supply'),
  firstTransactionDate: text('first_transaction_date'),
  lastTransactionDate: text('last_transaction_date'),
  totalBills: integer('total_bills').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),   // paise
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
  updatedAt: text('updated_at').notNull().default('(datetime(\'now\'))'),
}, (table) => ({
  mobileIdx: index('idx_customers_mobile').on(table.mobile),
  gstinIdx: index('idx_customers_gstin').on(table.gstin),
  nameIdx: index('idx_customers_name').on(table.name),
}));

// ─── Suppliers ──────────────────────────────────────────────────────
export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  referenceNumber: text('reference_number').notNull().unique(), // AGC-SUP-0001
  name: text('name').notNull(),
  mobile: text('mobile'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  stateCode: text('state_code'),
  gstin: text('gstin'),
  firstTransactionDate: text('first_transaction_date'),
  lastTransactionDate: text('last_transaction_date'),
  totalBills: integer('total_bills').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),   // paise
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
  updatedAt: text('updated_at').notNull().default('(datetime(\'now\'))'),
}, (table) => ({
  mobileIdx: index('idx_suppliers_mobile').on(table.mobile),
  gstinIdx: index('idx_suppliers_gstin').on(table.gstin),
  nameIdx: index('idx_suppliers_name').on(table.name),
}));

// ─── Tax Rates ──────────────────────────────────────────────────────
export const taxRates = sqliteTable('tax_rates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  rate: real('rate').notNull(),                      // percentage e.g. 3.0
  hsnCode: text('hsn_code'),
  sacCode: text('sac_code'),
  category: text('category').notNull(),              // goods | services
  effectiveFrom: text('effective_from'),
  effectiveTo: text('effective_to'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
});

// ─── HSN Master ─────────────────────────────────────────────────────
export const hsnMaster = sqliteTable('hsn_master', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  description: text('description').notNull(),
  defaultGstRate: real('default_gst_rate').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
});

// ─── SAC Master ─────────────────────────────────────────────────────
export const sacMaster = sqliteTable('sac_master', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  description: text('description').notNull(),
  defaultGstRate: real('default_gst_rate').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
});

// ─── Document Sequences ─────────────────────────────────────────────
export const documentSequences = sqliteTable('document_sequences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),              // sales | purchase | service
  prefix: text('prefix').notNull(),
  financialYearId: integer('financial_year_id').notNull().references(() => financialYears.id),
  lastNumber: integer('last_number').notNull().default(0),
  formatTemplate: text('format_template'),           // e.g. "{prefix}/{number}"
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
  updatedAt: text('updated_at').notNull().default('(datetime(\'now\'))'),
}, (table) => ({
  categoryFyIdx: uniqueIndex('idx_doc_seq_category_fy').on(table.category, table.financialYearId),
}));

// ─── Dealer Purchase Records ────────────────────────────────────────
export const dealerPurchaseRecords = sqliteTable('dealer_purchase_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recordNumber: text('record_number').notNull(),
  financialYearId: integer('financial_year_id').notNull().references(() => financialYears.id),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  originalInvoiceNumber: text('original_invoice_number'),
  originalInvoiceDate: text('original_invoice_date'),
  recordDate: text('record_date').notNull(),
  subtotal: integer('subtotal').notNull().default(0),                // paise
  totalDiscount: integer('total_discount').notNull().default(0),     // paise
  taxableAmount: integer('taxable_amount').notNull().default(0),     // paise
  cgstAmount: integer('cgst_amount').notNull().default(0),           // paise
  sgstAmount: integer('sgst_amount').notNull().default(0),           // paise
  igstAmount: integer('igst_amount').notNull().default(0),           // paise
  roundOff: integer('round_off').notNull().default(0),               // paise
  grandTotal: integer('grand_total').notNull().default(0),           // paise
  amountPaid: integer('amount_paid').notNull().default(0),           // paise
  balanceDue: integer('balance_due').notNull().default(0),           // paise
  paymentStatus: text('payment_status').notNull().default('unpaid'), // draft|partial|paid|unpaid
  status: text('status').notNull().default('draft'),                 // draft|saved|cancelled
  attachmentPath: text('attachment_path'),
  pdfPath: text('pdf_path'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
  updatedAt: text('updated_at').notNull().default('(datetime(\'now\'))'),
}, (table) => ({
  recordNumberIdx: uniqueIndex('idx_purchase_record_number').on(table.recordNumber, table.financialYearId),
  fyIdx: index('idx_purchase_fy').on(table.financialYearId),
  supplierIdx: index('idx_purchase_supplier').on(table.supplierId),
  dateIdx: index('idx_purchase_date').on(table.recordDate),
  paymentStatusIdx: index('idx_purchase_payment_status').on(table.paymentStatus),
  statusIdx: index('idx_purchase_status').on(table.status),
}));

// ─── Dealer Purchase Items ──────────────────────────────────────────
export const dealerPurchaseItems = sqliteTable('dealer_purchase_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  purchaseId: integer('purchase_id').notNull().references(() => dealerPurchaseRecords.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  category: text('category'),
  hsnCode: text('hsn_code'),
  quantity: integer('quantity').notNull().default(1),
  grossWeight: real('gross_weight'),
  netWeight: real('net_weight'),
  rate: integer('rate').notNull().default(0),                // paise
  taxableValue: integer('taxable_value').notNull().default(0), // paise
  gstRate: real('gst_rate').notNull().default(0),
  cgstAmount: integer('cgst_amount').notNull().default(0),   // paise
  sgstAmount: integer('sgst_amount').notNull().default(0),   // paise
  igstAmount: integer('igst_amount').notNull().default(0),   // paise
  totalValue: integer('total_value').notNull().default(0),   // paise
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  purchaseIdx: index('idx_purchase_items_purchase').on(table.purchaseId),
}));

// ─── Sales Invoices ─────────────────────────────────────────────────
export const salesInvoices = sqliteTable('sales_invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNumber: text('invoice_number').notNull(),
  financialYearId: integer('financial_year_id').notNull().references(() => financialYears.id),
  customerId: integer('customer_id').references(() => customers.id),
  invoiceDate: text('invoice_date').notNull(),
  placeOfSupply: text('place_of_supply'),
  supplyType: text('supply_type'),                                        // intra | inter
  subtotal: integer('subtotal').notNull().default(0),                     // paise
  totalDiscount: integer('total_discount').notNull().default(0),          // paise
  totalMakingCharges: integer('total_making_charges').notNull().default(0), // paise
  totalOtherCharges: integer('total_other_charges').notNull().default(0),   // paise
  taxableAmount: integer('taxable_amount').notNull().default(0),          // paise
  cgstAmount: integer('cgst_amount').notNull().default(0),                // paise
  sgstAmount: integer('sgst_amount').notNull().default(0),                // paise
  igstAmount: integer('igst_amount').notNull().default(0),                // paise
  roundOff: integer('round_off').notNull().default(0),                    // paise
  grandTotal: integer('grand_total').notNull().default(0),                // paise
  amountReceived: integer('amount_received').notNull().default(0),        // paise
  balanceDue: integer('balance_due').notNull().default(0),                // paise
  paymentStatus: text('payment_status').notNull().default('unpaid'),      // draft|partial|paid|unpaid
  status: text('status').notNull().default('draft'),                      // draft|finalized|cancelled
  pdfPath: text('pdf_path'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
  updatedAt: text('updated_at').notNull().default('(datetime(\'now\'))'),
}, (table) => ({
  invoiceNumberIdx: uniqueIndex('idx_sales_invoice_number').on(table.invoiceNumber, table.financialYearId),
  fyIdx: index('idx_sales_fy').on(table.financialYearId),
  customerIdx: index('idx_sales_customer').on(table.customerId),
  dateIdx: index('idx_sales_date').on(table.invoiceDate),
  paymentStatusIdx: index('idx_sales_payment_status').on(table.paymentStatus),
  statusIdx: index('idx_sales_status').on(table.status),
}));

// ─── Sales Invoice Items ────────────────────────────────────────────
export const salesInvoiceItems = sqliteTable('sales_invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => salesInvoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  category: text('category'),
  hsnCode: text('hsn_code'),
  quantity: integer('quantity').notNull().default(1),
  grossWeight: real('gross_weight'),
  netWeight: real('net_weight'),
  rate: integer('rate').notNull().default(0),                        // paise
  makingCharges: integer('making_charges').notNull().default(0),     // paise
  otherCharges: integer('other_charges').notNull().default(0),       // paise
  discount: integer('discount').notNull().default(0),                // paise
  taxableValue: integer('taxable_value').notNull().default(0),       // paise
  gstRate: real('gst_rate').notNull().default(0),
  cgstAmount: integer('cgst_amount').notNull().default(0),           // paise
  sgstAmount: integer('sgst_amount').notNull().default(0),           // paise
  igstAmount: integer('igst_amount').notNull().default(0),           // paise
  totalValue: integer('total_value').notNull().default(0),           // paise
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  invoiceIdx: index('idx_sales_items_invoice').on(table.invoiceId),
}));

// ─── Service Invoices ───────────────────────────────────────────────
export const serviceInvoices = sqliteTable('service_invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNumber: text('invoice_number').notNull(),
  financialYearId: integer('financial_year_id').notNull().references(() => financialYears.id),
  customerId: integer('customer_id').references(() => customers.id),
  invoiceDate: text('invoice_date').notNull(),
  placeOfSupply: text('place_of_supply'),
  supplyType: text('supply_type'),                                   // intra | inter
  subtotal: integer('subtotal').notNull().default(0),                // paise
  totalDiscount: integer('total_discount').notNull().default(0),     // paise
  taxableAmount: integer('taxable_amount').notNull().default(0),     // paise
  cgstAmount: integer('cgst_amount').notNull().default(0),           // paise
  sgstAmount: integer('sgst_amount').notNull().default(0),           // paise
  igstAmount: integer('igst_amount').notNull().default(0),           // paise
  roundOff: integer('round_off').notNull().default(0),               // paise
  grandTotal: integer('grand_total').notNull().default(0),           // paise
  amountReceived: integer('amount_received').notNull().default(0),   // paise
  balanceDue: integer('balance_due').notNull().default(0),           // paise
  paymentStatus: text('payment_status').notNull().default('unpaid'), // draft|partial|paid|unpaid
  status: text('status').notNull().default('draft'),                 // draft|finalized|cancelled
  pdfPath: text('pdf_path'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
  updatedAt: text('updated_at').notNull().default('(datetime(\'now\'))'),
}, (table) => ({
  invoiceNumberIdx: uniqueIndex('idx_service_invoice_number').on(table.invoiceNumber, table.financialYearId),
  fyIdx: index('idx_service_fy').on(table.financialYearId),
  customerIdx: index('idx_service_customer').on(table.customerId),
  dateIdx: index('idx_service_date').on(table.invoiceDate),
  paymentStatusIdx: index('idx_service_payment_status').on(table.paymentStatus),
  statusIdx: index('idx_service_status').on(table.status),
}));

// ─── Service Invoice Items ──────────────────────────────────────────
export const serviceInvoiceItems = sqliteTable('service_invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => serviceInvoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  sacCode: text('sac_code'),
  quantity: integer('quantity').notNull().default(1),
  rate: integer('rate').notNull().default(0),                    // paise
  discount: integer('discount').notNull().default(0),            // paise
  taxableValue: integer('taxable_value').notNull().default(0),   // paise
  gstRate: real('gst_rate').notNull().default(0),
  cgstAmount: integer('cgst_amount').notNull().default(0),       // paise
  sgstAmount: integer('sgst_amount').notNull().default(0),       // paise
  igstAmount: integer('igst_amount').notNull().default(0),       // paise
  totalValue: integer('total_value').notNull().default(0),       // paise
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  invoiceIdx: index('idx_service_items_invoice').on(table.invoiceId),
}));

// ─── Payments ───────────────────────────────────────────────────────
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  documentType: text('document_type').notNull(),                 // sales | purchase | service
  documentId: integer('document_id').notNull(),
  paymentDate: text('payment_date').notNull(),
  paymentMode: text('payment_mode').notNull(),                   // cash|upi|bank_transfer|cheque|other
  amount: integer('amount').notNull(),                           // paise
  referenceNumber: text('reference_number'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
}, (table) => ({
  docTypeIdx: index('idx_payments_doc_type').on(table.documentType, table.documentId),
  dateIdx: index('idx_payments_date').on(table.paymentDate),
}));

// ─── Document Files ─────────────────────────────────────────────────
export const documentFiles = sqliteTable('document_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  documentType: text('document_type').notNull(),                 // sales | purchase | service
  documentId: integer('document_id').notNull(),
  fileType: text('file_type').notNull(),                         // pdf | attachment
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
}, (table) => ({
  docTypeIdx: index('idx_doc_files_doc_type').on(table.documentType, table.documentId),
}));

// ─── Audit Logs ─────────────────────────────────────────────────────
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),                              // create | update | delete | login | logout
  entityType: text('entity_type').notNull(),                     // customer | supplier | sales_invoice | ...
  entityId: integer('entity_id'),
  oldValues: text('old_values'),                                 // JSON text
  newValues: text('new_values'),                                 // JSON text
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull().default('(datetime(\'now\'))'),
}, (table) => ({
  userIdx: index('idx_audit_user').on(table.userId),
  entityIdx: index('idx_audit_entity').on(table.entityType, table.entityId),
  dateIdx: index('idx_audit_date').on(table.createdAt),
}));

// ─── App Settings ───────────────────────────────────────────────────
export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
  category: text('category'),
  description: text('description'),
  updatedAt: text('updated_at').notNull().default('(datetime(\'now\'))'),
});

// ═══════════════════════════════════════════════════════════════════
// RELATIONS
// ═══════════════════════════════════════════════════════════════════

export const financialYearsRelations = relations(financialYears, ({ many }) => ({
  documentSequences: many(documentSequences),
  dealerPurchaseRecords: many(dealerPurchaseRecords),
  salesInvoices: many(salesInvoices),
  serviceInvoices: many(serviceInvoices),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  salesInvoices: many(salesInvoices),
  serviceInvoices: many(serviceInvoices),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  dealerPurchaseRecords: many(dealerPurchaseRecords),
}));

export const documentSequencesRelations = relations(documentSequences, ({ one }) => ({
  financialYear: one(financialYears, {
    fields: [documentSequences.financialYearId],
    references: [financialYears.id],
  }),
}));

export const dealerPurchaseRecordsRelations = relations(dealerPurchaseRecords, ({ one, many }) => ({
  financialYear: one(financialYears, {
    fields: [dealerPurchaseRecords.financialYearId],
    references: [financialYears.id],
  }),
  supplier: one(suppliers, {
    fields: [dealerPurchaseRecords.supplierId],
    references: [suppliers.id],
  }),
  createdByUser: one(users, {
    fields: [dealerPurchaseRecords.createdBy],
    references: [users.id],
  }),
  items: many(dealerPurchaseItems),
}));

export const dealerPurchaseItemsRelations = relations(dealerPurchaseItems, ({ one }) => ({
  purchase: one(dealerPurchaseRecords, {
    fields: [dealerPurchaseItems.purchaseId],
    references: [dealerPurchaseRecords.id],
  }),
}));

export const salesInvoicesRelations = relations(salesInvoices, ({ one, many }) => ({
  financialYear: one(financialYears, {
    fields: [salesInvoices.financialYearId],
    references: [financialYears.id],
  }),
  customer: one(customers, {
    fields: [salesInvoices.customerId],
    references: [customers.id],
  }),
  createdByUser: one(users, {
    fields: [salesInvoices.createdBy],
    references: [users.id],
  }),
  items: many(salesInvoiceItems),
}));

export const salesInvoiceItemsRelations = relations(salesInvoiceItems, ({ one }) => ({
  invoice: one(salesInvoices, {
    fields: [salesInvoiceItems.invoiceId],
    references: [salesInvoices.id],
  }),
}));

export const serviceInvoicesRelations = relations(serviceInvoices, ({ one, many }) => ({
  financialYear: one(financialYears, {
    fields: [serviceInvoices.financialYearId],
    references: [financialYears.id],
  }),
  customer: one(customers, {
    fields: [serviceInvoices.customerId],
    references: [customers.id],
  }),
  createdByUser: one(users, {
    fields: [serviceInvoices.createdBy],
    references: [users.id],
  }),
  items: many(serviceInvoiceItems),
}));

export const serviceInvoiceItemsRelations = relations(serviceInvoiceItems, ({ one }) => ({
  invoice: one(serviceInvoices, {
    fields: [serviceInvoiceItems.invoiceId],
    references: [serviceInvoices.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLogs),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
