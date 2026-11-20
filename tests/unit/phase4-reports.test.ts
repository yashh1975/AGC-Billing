import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { runMigrations } from '../../electron/database/migrate';
import { seedData } from '../../electron/database/seed';
import { ExcelService } from '../../electron/services/excel-service';
import { BackupService } from '../../electron/services/backup-service';
import { performGlobalSearch } from '../../electron/ipc/search';
import AdmZip from 'adm-zip';

describe('Phase 4 - Search, CA/GST Excel Reports & System Backup', () => {
  let db: Database.Database;
  let tempDir: string;
  let fyId: number;

  beforeEach(() => {
    // Create temporary directory for isolation
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agc-test-p4-'));
    const dbPath = path.join(tempDir, 'agc-billing.db');
    db = new Database(dbPath);
    runMigrations(db);
    seedData(db);

    // Insert active financial year 2026-27
    const fy = db
      .prepare("INSERT INTO financial_years (name, start_date, end_date, is_active) VALUES ('2026-27', '2026-04-01', '2027-03-31', 1)")
      .run();
    fyId = Number(fy.lastInsertRowid);

    // Mock electron file manager directory
    const mockFileMgr = {
      getDataDirectory: () => tempDir,
    };
    (global as any).__mockFileMgr = mockFileMgr;
  });

  afterEach(() => {
    if (db) db.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // 1. GLOBAL SEARCH & UNIFIED BILLS QUERY
  // ─────────────────────────────────────────────────────────────────
  it('multi-entity search returns matching records across sales, customers, and suppliers', () => {
    // Insert test customer
    const insertCus = db.prepare(`
      INSERT INTO customers (reference_number, name, mobile, gstin, state, place_of_supply)
      VALUES ('AGC-CUS-0099', 'Vikramaditya Jewellers', '9876543210', '29ABCDE1234F1Z5', 'Karnataka', 'Karnataka')
    `).run();
    const customerId = insertCus.lastInsertRowid;

    // Insert test sales invoice
    db.prepare(`
      INSERT INTO sales_invoices (invoice_number, customer_id, financial_year_id, invoice_date, status, payment_status, taxable_amount, cgst_amount, sgst_amount, igst_amount, grand_total, amount_received, balance_due)
      VALUES ('AGC/S/26-27/0099', ?, ?, '2026-11-18', 'finalized', 'paid', 10000000, 150000, 150000, 0, 10300000, 10300000, 0)
    `).run(customerId, fyId);

    // Insert test supplier
    const insertSup = db.prepare(`
      INSERT INTO suppliers (reference_number, name, mobile, gstin, state)
      VALUES ('AGC-SUP-0099', 'Rajesh Bullion Refiners', '9988776655', '29XYZAB5678C1Z2', 'Karnataka')
    `).run();
    const supplierId = insertSup.lastInsertRowid;

    // Insert test dealer purchase
    db.prepare(`
      INSERT INTO dealer_purchase_records (record_number, supplier_id, financial_year_id, original_invoice_number, original_invoice_date, record_date, status, payment_status, taxable_amount, cgst_amount, sgst_amount, igst_amount, grand_total, amount_paid, balance_due)
      VALUES ('AGC/P/26-27/0099', ?, ?, 'INV-SUP-888', '2026-11-15', '2026-11-18', 'finalized', 'paid', 20000000, 300000, 300000, 0, 20600000, 20600000, 0)
    `).run(supplierId, fyId);

    // Search for "Vikramaditya" via real search service logic
    const cusResults = performGlobalSearch(db, 'Vikramaditya');
    expect(cusResults.length).toBeGreaterThanOrEqual(1);
    expect(cusResults.some(r => r.category === 'customer' && r.referenceNumber === 'AGC-CUS-0099')).toBe(true);

    // Search for "0099"
    const salesResults = performGlobalSearch(db, '0099');
    expect(salesResults.length).toBeGreaterThanOrEqual(1);
    expect(salesResults.some(r => r.category === 'sales' && r.referenceNumber === 'AGC/S/26-27/0099')).toBe(true);

    // Search for original supplier bill "INV-SUP-888"
    const purchaseResults = performGlobalSearch(db, 'INV-SUP-888');
    expect(purchaseResults.length).toBeGreaterThanOrEqual(1);
    expect(purchaseResults.some(r => r.category === 'purchase' && r.referenceNumber === 'AGC/P/26-27/0099')).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. EXCEL REPORT WORKBOOK GENERATION
  // ─────────────────────────────────────────────────────────────────
  it('CA workbook export creates all 5 registers with statutory tax breakdowns and no purity columns', async () => {
    // Populate sales invoice with items
    const cus = db.prepare(`
      INSERT INTO customers (reference_number, name, mobile, gstin)
      VALUES ('AGC-CUS-0001', 'Ramesh Kumar', '9845011223', '29ABCDE1234F1Z5')
    `).run();

    const sale = db.prepare(`
      INSERT INTO sales_invoices (invoice_number, customer_id, financial_year_id, invoice_date, status, payment_status, taxable_amount, cgst_amount, sgst_amount, igst_amount, grand_total, amount_received, balance_due)
      VALUES ('AGC/S/26-27/0001', ?, ?, '2026-11-18', 'finalized', 'paid', 5000000, 75000, 75000, 0, 5150000, 5150000, 0)
    `).run(cus.lastInsertRowid, fyId);

    db.prepare(`
      INSERT INTO sales_invoice_items (invoice_id, description, hsn_code, quantity, gross_weight, net_weight, rate, making_charges, taxable_value, gst_rate, cgst_amount, sgst_amount, total_value)
      VALUES (?, 'Gold Kada Bracelet', '7113', 1, 10.500, 10.200, 4500000, 500000, 5000000, 3.0, 75000, 75000, 5150000)
    `).run(sale.lastInsertRowid);

    // Populate dealer purchase with items
    const sup = db.prepare(`
      INSERT INTO suppliers (reference_number, name, mobile, gstin)
      VALUES ('AGC-SUP-0001', 'National Bullion Corp', '9880011223', '29XYZAB9876C1Z2')
    `).run();

    const purch = db.prepare(`
      INSERT INTO dealer_purchase_records (record_number, supplier_id, financial_year_id, original_invoice_number, original_invoice_date, record_date, status, payment_status, taxable_amount, cgst_amount, sgst_amount, igst_amount, grand_total, amount_paid, balance_due)
      VALUES ('AGC/P/26-27/0001', ?, ?, 'NBC/2026/901', '2026-11-10', '2026-11-18', 'finalized', 'paid', 9000000, 135000, 135000, 0, 9270000, 9270000, 0)
    `).run(sup.lastInsertRowid, fyId);

    db.prepare(`
      INSERT INTO dealer_purchase_items (purchase_id, description, hsn_code, quantity, gross_weight, net_weight, taxable_value, gst_rate, cgst_amount, sgst_amount, total_value)
      VALUES (?, 'Gold Bullion Bar', '7113', 1, 20.000, 20.000, 9000000, 3.0, 135000, 135000, 9270000)
    `).run(purch.lastInsertRowid);

    // Populate service invoice
    const serv = db.prepare(`
      INSERT INTO service_invoices (invoice_number, customer_id, financial_year_id, invoice_date, status, payment_status, taxable_amount, cgst_amount, sgst_amount, igst_amount, grand_total, amount_received, balance_due)
      VALUES ('AGC/SV/26-27/0001', ?, ?, '2026-11-18', 'finalized', 'paid', 500000, 12500, 12500, 0, 525000, 525000, 0)
    `).run(cus.lastInsertRowid, fyId);

    db.prepare(`
      INSERT INTO service_invoice_items (invoice_id, description, sac_code, quantity, rate, taxable_value, gst_rate, cgst_amount, sgst_amount, total_value)
      VALUES (?, 'Jewellery Polishing & Laser Soldering', '9988', 1, 500000, 500000, 5.0, 12500, 12500, 525000)
    `).run(serv.lastInsertRowid);

    // Instantiate and test ExcelService with customDb
    const excelService = new ExcelService();
    const result = await excelService.generateReport({
      fyId,
      period: 'full',
      type: 'all',
    }, db);

    expect(result.filePath).toBeDefined();
    expect(fs.existsSync(result.filePath)).toBe(true);

    // Read back generated workbook with ExcelJS
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(result.filePath);

    // Verify all 5 sheets exist
    const sheetNames = wb.worksheets.map((s) => s.name);
    expect(sheetNames).toContain('Sales Register');
    expect(sheetNames).toContain('Dealer Purchases');
    expect(sheetNames).toContain('Service Register');
    expect(sheetNames).toContain('GST Tax Summary');
    expect(sheetNames).toContain('HSN-SAC Summary');

    // Strict verification: Check Sales Register headers - PURITY MUST NOT EXIST!
    const salesSheet = wb.getWorksheet('Sales Register');
    expect(salesSheet).toBeDefined();
    const headerRow = salesSheet!.getRow(5);
    const headers = headerRow.values as string[];

    const hasPurity = headers.some((h) => typeof h === 'string' && /purity|carat|karat|22k|24k|916/i.test(h));
    expect(hasPurity).toBe(false);

    // Verify Dealer Purchase register has internal disclaimer in title
    const purchSheet = wb.getWorksheet('Dealer Purchases');
    const titleVal = String(purchSheet!.getCell('A3').value || '');
    expect(titleVal).toContain('NOT TAX INVOICE');
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. BACKUP SYSTEM & CHECKSUM VERIFICATION
  // ─────────────────────────────────────────────────────────────────
  it('automated backup creates verified zip archive with sqlite database snapshot and manifest', async () => {
    const backupService = new BackupService();
    const backupResult = await backupService.createBackup(tempDir, db);

    expect(backupResult.success).toBe(true);
    expect(backupResult.data).toBeDefined();
    expect(backupResult.data?.fileName).toMatch(/^AGC_Backup_.*\.zip$/);
    expect(fs.existsSync(backupResult.data!.filePath)).toBe(true);
    expect(backupResult.data?.sha256).toBeDefined();
    expect(backupResult.data!.sha256.length).toBe(64); // Valid SHA-256 hex length

    // Inspect ZIP content
    const zip = new AdmZip(backupResult.data!.filePath);
    const entries = zip.getEntries().map((e) => e.entryName);
    expect(entries).toContain('billing.db');
    expect(entries).toContain('manifest.json');

    // Verify manifest contents
    const manifestEntry = zip.getEntry('manifest.json');
    expect(manifestEntry).toBeDefined();
    const manifestJson = JSON.parse(manifestEntry!.getData().toString('utf-8'));
    expect(manifestJson.application).toBe('AGC Billing & Management System');
  });
});
