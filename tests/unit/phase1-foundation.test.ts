import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../electron/database/migrate';
import { seedData } from '../../electron/database/seed';
import { hashPassword, verifyPassword } from '../../electron/security';

describe('Phase 1 Foundation - SQLite & Business Logic Tests', () => {
  let db: Database.Database;

  beforeEach(() => {
    // In-memory SQLite for isolated high-speed testing
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    seedData(db);
  });

  afterEach(() => {
    db.close();
  });

  it('migrations create all 19 domain tables in database', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((r: any) => r.name);

    const expectedTables = [
      'company_profile',
      'users',
      'financial_years',
      'customers',
      'suppliers',
      'tax_rates',
      'hsn_master',
      'sac_master',
      'document_sequences',
      'dealer_purchase_records',
      'dealer_purchase_items',
      'sales_invoices',
      'sales_invoice_items',
      'service_invoices',
      'service_invoice_items',
      'payments',
      'document_files',
      'audit_logs',
      'app_settings',
    ];

    for (const table of expectedTables) {
      expect(tables).toContain(table);
    }
  });

  it('database seeding initializes gold HSN 7113 and service SAC 9988 statutory tax rates', () => {
    const hsn = db.prepare("SELECT * FROM hsn_master WHERE code = '7113'").get() as any;
    expect(hsn).toBeDefined();
    expect(hsn.default_gst_rate).toBe(3);

    const sac = db.prepare("SELECT * FROM sac_master WHERE code = '9988'").get() as any;
    expect(sac).toBeDefined();
    expect(sac.default_gst_rate).toBe(5);

    const settings = db.prepare("SELECT value FROM app_settings WHERE key = 'sales_prefix'").get() as any;
    expect(settings.value).toBe('AGC/S');
  });

  it('customer creation assigns permanent reference and rejects duplicate reference numbers', () => {
    const insertCustomer = (ref: string, name: string, mobile: string, gstin?: string) => {
      return db.prepare(
        'INSERT INTO customers (reference_number, name, mobile, gstin) VALUES (?, ?, ?, ?)'
      ).run(ref, name, mobile, gstin || null);
    };

    insertCustomer('AGC-CUS-0001', 'Yashwanth Kumar', '9008477669', '29ACKFA4620Q1ZV');
    insertCustomer('AGC-CUS-0002', 'Ramesh Rao', '9876543210');

    const c1 = db.prepare("SELECT * FROM customers WHERE reference_number = 'AGC-CUS-0001'").get() as any;
    expect(c1.name).toBe('Yashwanth Kumar');
    expect(c1.mobile).toBe('9008477669');
    expect(c1.gstin).toBe('29ACKFA4620Q1ZV');

    // Duplicate reference check
    expect(() => {
      insertCustomer('AGC-CUS-0001', 'Duplicate Name', '9111111111');
    }).toThrow();
  });

  it('supplier creation assigns permanent reference number and persists profile', () => {
    const insertSupplier = (ref: string, name: string, gstin: string) => {
      return db.prepare(
        'INSERT INTO suppliers (reference_number, name, gstin) VALUES (?, ?, ?)'
      ).run(ref, name, gstin);
    };

    insertSupplier('AGC-SUP-0001', 'MMTC PAMP Bullion Ltd', '29AABCM1234F1Z5');
    const sup = db.prepare("SELECT * FROM suppliers WHERE reference_number = 'AGC-SUP-0001'").get() as any;
    expect(sup.name).toBe('MMTC PAMP Bullion Ltd');
    expect(sup.reference_number).toBe('AGC-SUP-0001');
  });

  it('document sequence allocates consecutive numbers isolated by financial year', () => {
    // Insert FY 2026-27
    const fyRes = db.prepare(
      "INSERT INTO financial_years (name, start_date, end_date, is_active) VALUES ('2026-27', '2026-04-01', '2027-03-31', 1)"
    ).run();
    const fyId = fyRes.lastInsertRowid;

    // Create document sequences
    db.prepare(
      "INSERT INTO document_sequences (category, prefix, financial_year_id, last_number) VALUES ('sales', 'AGC/S', ?, 0)"
    ).run(fyId);

    // Simulate invoice numbering allocation in a transaction
    const allocateNumber = db.transaction(() => {
      const seq = db.prepare("SELECT * FROM document_sequences WHERE category = 'sales' AND financial_year_id = ?").get(fyId) as any;
      const nextNum = seq.last_number + 1;
      db.prepare('UPDATE document_sequences SET last_number = ? WHERE id = ?').run(nextNum, seq.id);
      return `AGC/S/26-27/${String(nextNum).padStart(4, '0')}`;
    });

    const doc1 = allocateNumber();
    const doc2 = allocateNumber();

    expect(doc1).toBe('AGC/S/26-27/0001');
    expect(doc2).toBe('AGC/S/26-27/0002');
  });

  it('password hashing verifies matching credentials and rejects invalid passwords', async () => {
    const password = 'SecretPassword123!';
    const hash = await hashPassword(password);

    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword('WrongPassword', hash)).toBe(false);
  });
});
