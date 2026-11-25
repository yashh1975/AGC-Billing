import Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  console.log('[Migrations] Running...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS company_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL,
      legal_name TEXT,
      gstin TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      state_code TEXT,
      pincode TEXT,
      phone TEXT,
      email TEXT,
      logo_path TEXT,
      bank_name TEXT,
      bank_account_name TEXT,
      bank_account_number TEXT,
      bank_ifsc TEXT,
      bank_branch TEXT,
      signature_path TEXT,
      invoice_footer TEXT,
      terms_sales TEXT,
      terms_service TEXT,
      terms_purchase TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS financial_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      mobile TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      state_code TEXT,
      gstin TEXT,
      place_of_supply TEXT,
      first_transaction_date TEXT,
      last_transaction_date TEXT,
      total_bills INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
    CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers(gstin);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      mobile TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      state_code TEXT,
      gstin TEXT,
      first_transaction_date TEXT,
      last_transaction_date TEXT,
      total_bills INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_suppliers_mobile ON suppliers(mobile);
    CREATE INDEX IF NOT EXISTS idx_suppliers_gstin ON suppliers(gstin);
    CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

    CREATE TABLE IF NOT EXISTS tax_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rate REAL NOT NULL,
      hsn_code TEXT,
      sac_code TEXT,
      category TEXT NOT NULL,
      effective_from TEXT,
      effective_to TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hsn_master (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      default_gst_rate REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sac_master (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      default_gst_rate REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      prefix TEXT NOT NULL,
      financial_year_id INTEGER NOT NULL REFERENCES financial_years(id),
      last_number INTEGER NOT NULL DEFAULT 0,
      format_template TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_seq_category_fy ON document_sequences(category, financial_year_id);

    CREATE TABLE IF NOT EXISTS dealer_purchase_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_number TEXT NOT NULL,
      financial_year_id INTEGER NOT NULL REFERENCES financial_years(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      original_invoice_number TEXT,
      original_invoice_date TEXT,
      record_date TEXT NOT NULL,
      subtotal INTEGER NOT NULL DEFAULT 0,
      total_discount INTEGER NOT NULL DEFAULT 0,
      taxable_amount INTEGER NOT NULL DEFAULT 0,
      cgst_amount INTEGER NOT NULL DEFAULT 0,
      sgst_amount INTEGER NOT NULL DEFAULT 0,
      igst_amount INTEGER NOT NULL DEFAULT 0,
      round_off INTEGER NOT NULL DEFAULT 0,
      grand_total INTEGER NOT NULL DEFAULT 0,
      amount_paid INTEGER NOT NULL DEFAULT 0,
      balance_due INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      status TEXT NOT NULL DEFAULT 'draft',
      attachment_path TEXT,
      pdf_path TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_record_number ON dealer_purchase_records(record_number, financial_year_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_fy ON dealer_purchase_records(financial_year_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_supplier ON dealer_purchase_records(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_date ON dealer_purchase_records(record_date);
    CREATE INDEX IF NOT EXISTS idx_purchase_payment_status ON dealer_purchase_records(payment_status);
    CREATE INDEX IF NOT EXISTS idx_purchase_status ON dealer_purchase_records(status);

    CREATE TABLE IF NOT EXISTS dealer_purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES dealer_purchase_records(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      category TEXT,
      hsn_code TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      gross_weight REAL,
      net_weight REAL,
      rate INTEGER NOT NULL DEFAULT 0,
      va_percent REAL DEFAULT 0,
      va_amount INTEGER NOT NULL DEFAULT 0,
      taxable_value INTEGER NOT NULL DEFAULT 0,
      gst_rate REAL NOT NULL DEFAULT 0,
      cgst_amount INTEGER NOT NULL DEFAULT 0,
      sgst_amount INTEGER NOT NULL DEFAULT 0,
      igst_amount INTEGER NOT NULL DEFAULT 0,
      total_value INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON dealer_purchase_items(purchase_id);

    CREATE TABLE IF NOT EXISTS sales_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL,
      financial_year_id INTEGER NOT NULL REFERENCES financial_years(id),
      customer_id INTEGER REFERENCES customers(id),
      invoice_date TEXT NOT NULL,
      place_of_supply TEXT,
      supply_type TEXT,
      subtotal INTEGER NOT NULL DEFAULT 0,
      total_discount INTEGER NOT NULL DEFAULT 0,
      total_making_charges INTEGER NOT NULL DEFAULT 0,
      total_other_charges INTEGER NOT NULL DEFAULT 0,
      taxable_amount INTEGER NOT NULL DEFAULT 0,
      cgst_amount INTEGER NOT NULL DEFAULT 0,
      sgst_amount INTEGER NOT NULL DEFAULT 0,
      igst_amount INTEGER NOT NULL DEFAULT 0,
      round_off INTEGER NOT NULL DEFAULT 0,
      grand_total INTEGER NOT NULL DEFAULT 0,
      amount_received INTEGER NOT NULL DEFAULT 0,
      balance_due INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      status TEXT NOT NULL DEFAULT 'draft',
      pdf_path TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales_invoices(invoice_number, financial_year_id);
    CREATE INDEX IF NOT EXISTS idx_sales_fy ON sales_invoices(financial_year_id);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales_invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_invoices(invoice_date);
    CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales_invoices(payment_status);
    CREATE INDEX IF NOT EXISTS idx_sales_status ON sales_invoices(status);

    CREATE TABLE IF NOT EXISTS sales_invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      category TEXT,
      hsn_code TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      gross_weight REAL,
      net_weight REAL,
      rate INTEGER NOT NULL DEFAULT 0,
      va_percent REAL DEFAULT 0,
      va_amount INTEGER NOT NULL DEFAULT 0,
      making_charges INTEGER NOT NULL DEFAULT 0,
      other_charges INTEGER NOT NULL DEFAULT 0,
      discount INTEGER NOT NULL DEFAULT 0,
      taxable_value INTEGER NOT NULL DEFAULT 0,
      gst_rate REAL NOT NULL DEFAULT 0,
      cgst_amount INTEGER NOT NULL DEFAULT 0,
      sgst_amount INTEGER NOT NULL DEFAULT 0,
      igst_amount INTEGER NOT NULL DEFAULT 0,
      total_value INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sales_items_invoice ON sales_invoice_items(invoice_id);

    CREATE TABLE IF NOT EXISTS service_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL,
      financial_year_id INTEGER NOT NULL REFERENCES financial_years(id),
      customer_id INTEGER REFERENCES customers(id),
      invoice_date TEXT NOT NULL,
      place_of_supply TEXT,
      supply_type TEXT,
      subtotal INTEGER NOT NULL DEFAULT 0,
      total_discount INTEGER NOT NULL DEFAULT 0,
      taxable_amount INTEGER NOT NULL DEFAULT 0,
      cgst_amount INTEGER NOT NULL DEFAULT 0,
      sgst_amount INTEGER NOT NULL DEFAULT 0,
      igst_amount INTEGER NOT NULL DEFAULT 0,
      round_off INTEGER NOT NULL DEFAULT 0,
      grand_total INTEGER NOT NULL DEFAULT 0,
      amount_received INTEGER NOT NULL DEFAULT 0,
      balance_due INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      status TEXT NOT NULL DEFAULT 'draft',
      pdf_path TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_service_invoice_number ON service_invoices(invoice_number, financial_year_id);
    CREATE INDEX IF NOT EXISTS idx_service_fy ON service_invoices(financial_year_id);
    CREATE INDEX IF NOT EXISTS idx_service_customer ON service_invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_service_date ON service_invoices(invoice_date);
    CREATE INDEX IF NOT EXISTS idx_service_payment_status ON service_invoices(payment_status);
    CREATE INDEX IF NOT EXISTS idx_service_status ON service_invoices(status);

    CREATE TABLE IF NOT EXISTS service_invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES service_invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      sac_code TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      rate INTEGER NOT NULL DEFAULT 0,
      principal_amount INTEGER NOT NULL DEFAULT 0,
      service_amount INTEGER NOT NULL DEFAULT 0,
      discount INTEGER NOT NULL DEFAULT 0,
      taxable_value INTEGER NOT NULL DEFAULT 0,
      gst_rate REAL NOT NULL DEFAULT 0,
      cgst_amount INTEGER NOT NULL DEFAULT 0,
      sgst_amount INTEGER NOT NULL DEFAULT 0,
      igst_amount INTEGER NOT NULL DEFAULT 0,
      total_value INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_service_items_invoice ON service_invoice_items(invoice_id);

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_type TEXT NOT NULL,
      document_id INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      payment_mode TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reference_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_payments_doc_type ON payments(document_type, document_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

    CREATE TABLE IF NOT EXISTS document_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_type TEXT NOT NULL,
      document_id INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_doc_files_doc_type ON document_files(document_type, document_id);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      category TEXT,
      description TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pledge_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_date TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_address TEXT,
      phone_number TEXT,
      principal_amount REAL NOT NULL DEFAULT 0,
      interest_rate TEXT,
      pledge_date TEXT,
      pledged_name TEXT,
      pledged_item_name TEXT,
      pledge_place TEXT,
      pledge_amount REAL NOT NULL DEFAULT 0,
      pledge_interest TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_pledge_date ON pledge_records(record_date);
    CREATE INDEX IF NOT EXISTS idx_pledge_customer ON pledge_records(customer_name);
    CREATE INDEX IF NOT EXISTS idx_pledge_status ON pledge_records(status);
  `);

  // Ensure principal_amount and service_amount columns exist in service_invoice_items
  try {
    db.prepare('ALTER TABLE service_invoice_items ADD COLUMN principal_amount INTEGER NOT NULL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE service_invoice_items ADD COLUMN service_amount INTEGER NOT NULL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE sales_invoice_items ADD COLUMN va_percent REAL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE sales_invoice_items ADD COLUMN va_amount INTEGER NOT NULL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE dealer_purchase_items ADD COLUMN va_percent REAL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE dealer_purchase_items ADD COLUMN va_amount INTEGER NOT NULL DEFAULT 0').run();
  } catch {}
  try {
    db.prepare('ALTER TABLE pledge_records ADD COLUMN pledged_name TEXT').run();
  } catch {}
  try {
    db.prepare(`
      UPDATE pledge_records 
      SET pledged_name = 'soma', pledged_item_name = 'Gold Chain (Takeover)'
      WHERE (pledged_name IS NULL OR pledged_name = '') AND LOWER(pledged_item_name) = 'soma'
    `).run();
  } catch {}
  try {
    db.prepare(`
      UPDATE pledge_records 
      SET pledged_name = customer_name
      WHERE pledged_name IS NULL OR pledged_name = ''
    `).run();
  } catch {}

  try {
    const profileCount = db.prepare('SELECT COUNT(*) as count FROM company_profile').get() as { count: number };
    if (profileCount.count === 0) {
      db.prepare(`
        INSERT INTO company_profile (
          business_name, legal_name, gstin, address, city, state, state_code, pincode,
          phone, email, bank_name, bank_account_name, bank_account_number, bank_ifsc, bank_branch
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'ANJANEYA GOLD COMPANY',
        'ANJANEYA GOLD COMPANY',
        '29ACKFA4620Q1ZV',
        '#20, 1ST FLOOR, SARASWATHIPURA MAIN ROAD, OPP. SATHYA SHANTHI GANAPATHI TEMPLE, NANDINI LAYOUT',
        'Bengaluru',
        'Karnataka',
        '29',
        '560096',
        '9008477669',
        'anjaneyagoldcompany@gmail.com',
        'IDFC',
        'ANJANEYA GOLD COMPANY',
        '10309933727',
        'IDFB0081179',
        'Nandini Layout'
      );
    } else {
      db.prepare(`
        UPDATE company_profile
        SET email = 'anjaneyagoldcompany@gmail.com'
        WHERE email IS NULL OR trim(email) = '' OR email = 'ANJANEYAGOLDCOMPANY@GMAIL.COM'
      `).run();
      db.prepare(`
        UPDATE company_profile
        SET gstin = '29ACKFA4620Q1ZV'
        WHERE gstin IS NULL OR trim(gstin) = '' OR gstin = 'NOT_CONFIGURED' OR gstin = '29ACKFA4620QIZV'
      `).run();
    }
  } catch (seedErr) {
    console.warn('[Migrations] company_profile seed note:', seedErr);
  }

  console.log('[Migrations] Complete');
}
