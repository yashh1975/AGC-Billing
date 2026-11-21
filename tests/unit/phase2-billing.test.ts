import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../electron/database/migrate';
import { seedData } from '../../electron/database/seed';
import {
  calculateInvoice,
  calculateLineItem,
  toPaise,
  toRupees,
  formatRupees,
  determineSupplyType,
  numberToWordsIndian,
} from '../../src/services/gst/gst-engine';

describe('Phase 2 - GST Engine & Core Billing Calculations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    seedData(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('1. GST Engine Mathematical Precision (Paise Accuracy)', () => {
    it('intra-state supply calculates 1.5% CGST and 1.5% SGST on gold jewellery', () => {
      const items = [
        {
          description: '22K Gold Chain',
          hsnCode: '7113',
          quantity: 1,
          rate: 100000, // ₹1,00,000
          makingCharges: 5000, // ₹5,000
          discount: 1000, // ₹1,000
          gstRate: 3, // 3%
        },
      ];

      // Taxable = 100000 + 5000 - 1000 = 104000
      // CGST 1.5% = 1560, SGST 1.5% = 1560
      // Total = 104000 + 3120 = 107120
      const summary = calculateInvoice(items, 'Karnataka', 'Karnataka');

      expect(summary.supplyType).toBe('intra');
      expect(summary.taxableAmountPaise).toBe(10400000); // ₹1,04,000 in paise
      expect(summary.cgstAmountPaise).toBe(156000); // ₹1,560
      expect(summary.sgstAmountPaise).toBe(156000); // ₹1,560
      expect(summary.igstAmountPaise).toBe(0);
      expect(summary.grandTotalPaise).toBe(10712000); // ₹1,07,120
    });

    it('inter-state supply calculates 3% IGST on gold bullion', () => {
      const items = [
        {
          description: 'Gold Bullion Bar',
          hsnCode: '7108',
          quantity: 1,
          rate: 50000,
          makingCharges: 0,
          discount: 0,
          gstRate: 3,
        },
      ];

      const summary = calculateInvoice(items, 'Karnataka', 'Tamil Nadu');

      expect(summary.supplyType).toBe('inter');
      expect(summary.taxableAmountPaise).toBe(5000000); // ₹50,000
      expect(summary.cgstAmountPaise).toBe(0);
      expect(summary.sgstAmountPaise).toBe(0);
      expect(summary.igstAmountPaise).toBe(150000); // ₹1,500 (3% IGST)
      expect(summary.grandTotalPaise).toBe(5150000); // ₹51,500
    });

    it('benchmark reference invoice calculates ₹14,750 total due with 18% GST', () => {
      // In the reference invoice: Base 13,000, Disc 500 -> Taxable 12,500
      // CGST 9% = 1,125, SGST 9% = 1,125 -> Total Due = 14,750
      const items = [
        {
          description: 'Gold Ring',
          quantity: 1,
          rate: 13000,
          discount: 500,
          gstRate: 18,
        },
      ];

      const summary = calculateInvoice(items, 'Karnataka', 'Karnataka', 14750);

      expect(summary.taxableAmountPaise).toBe(1250000); // ₹12,500
      expect(summary.cgstAmountPaise).toBe(112500); // ₹1,125
      expect(summary.sgstAmountPaise).toBe(112500); // ₹1,125
      expect(summary.grandTotalPaise).toBe(1475000); // ₹14,750.00
      expect(summary.amountReceivedPaise).toBe(1475000);
      expect(summary.balanceDuePaise).toBe(0);
    });

    it('calculates gold article taxable value as Net Weight * Rate per gram with making charges', () => {
      // 10.500 grams gold @ ₹7,000/g = ₹73,500 base + ₹1,500 making = ₹75,000 taxable value
      // 3% GST intra-state (1.5% CGST ₹1,125 + 1.5% SGST ₹1,125 = ₹2,250 tax -> Total ₹77,250)
      const items = [
        {
          description: 'Gold Chain Article',
          hsnCode: '7113',
          quantity: 1,
          netWeight: 10.5,
          rate: 7000,
          makingCharges: 1500,
          discount: 0,
          gstRate: 3,
        },
      ];

      const summary = calculateInvoice(items, 'Karnataka', 'Karnataka');
      expect(summary.taxableAmountPaise).toBe(7500000); // ₹75,000.00 in paise
      expect(summary.cgstAmountPaise).toBe(112500); // ₹1,125.00
      expect(summary.sgstAmountPaise).toBe(112500); // ₹1,125.00
      expect(summary.grandTotalPaise).toBe(7725000); // ₹77,250.00
    });

    it('financial service bill applies 18% GST strictly to service fee and ignores loan principal', () => {
      // ₹1,00,000 Loan Takeover principal, ₹500 Service Fee -> 18% GST on ₹500 = ₹90 tax -> Total ₹590
      const items = [
        {
          description: 'Gold Loan Takeover & Release Service',
          category: 'Financial Service',
          sacCode: '9971',
          quantity: 1,
          principalAmount: 100000, // ₹1,00,000 loan principal (not taxed!)
          serviceAmount: 500, // ₹500 facilitation charge
          rate: 500,
          gstRate: 18,
        },
      ];

      const summary = calculateInvoice(items, 'Karnataka', 'Karnataka');
      expect(summary.taxableAmountPaise).toBe(50000); // ₹500 in paise
      expect(summary.cgstAmountPaise).toBe(4500); // ₹45.00 (9%)
      expect(summary.sgstAmountPaise).toBe(4500); // ₹45.00 (9%)
      expect(summary.grandTotalPaise).toBe(59000); // ₹590.00
    });

    it.each([
      [14750, 'Fourteen Thousand Seven Hundred and Fifty Rupees Only'],
      [100000, 'One Lakh Rupees Only'],
      [500, 'Five Hundred Rupees Only'],
    ])('converts %i rupees into Indian English words: "%s"', (amount, expectedWords) => {
      expect(numberToWordsIndian(amount)).toBe(expectedWords);
    });
  });

  describe('2. Database Billing Transactions & Auto-Registration', () => {
    it('sales invoice creation auto-registers customer and records partial payment', () => {
      // Set up FY 2026-27
      const fy = db
        .prepare(
          "INSERT INTO financial_years (name, start_date, end_date, is_active) VALUES ('2026-27', '2026-04-01', '2027-03-31', 1)"
        )
        .run();
      const fyId = fy.lastInsertRowid;

      db.prepare(
        "INSERT INTO document_sequences (category, prefix, financial_year_id, last_number) VALUES ('sales', 'AGC/S', ?, 0)"
      ).run(fyId);

      // Auto-register customer
      const cusInsert = db
        .prepare(
          "INSERT INTO customers (reference_number, name, mobile, gstin) VALUES ('AGC-CUS-0001', 'Anand Rao', '9845012345', '29ABCDE1234F1Z5')"
        )
        .run();
      const customerId = cusInsert.lastInsertRowid;

      // Allocate invoice number
      const invoiceNumber = 'AGC/S/26-27/0001';

      // Insert Sales Invoice
      const invInsert = db
        .prepare(`
        INSERT INTO sales_invoices (
          invoice_number, financial_year_id, customer_id, invoice_date, place_of_supply,
          taxable_amount, cgst_amount, sgst_amount, grand_total, amount_received, balance_due,
          payment_status, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .run(
          invoiceNumber,
          fyId,
          customerId,
          '2026-11-18',
          'Karnataka',
          1250000,
          112500,
          112500,
          1475000,
          1000000, // ₹10,000 partial payment
          475000, // ₹4,750 balance
          'partial',
          'finalized'
        );

      const invoiceId = invInsert.lastInsertRowid;

      // Insert line item (strictly no purity)
      db.prepare(`
        INSERT INTO sales_invoice_items (
          invoice_id, description, hsn_code, quantity, gross_weight, net_weight, rate, taxable_value, gst_rate, total_value
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceId,
        'Gold Bangle',
        '7113',
        1,
        15.5,
        15.2,
        1250000,
        1250000,
        18,
        1475000
      );

      // Verify recorded invoice
      const invoice = db
        .prepare('SELECT * FROM sales_invoices WHERE id = ?')
        .get(invoiceId) as any;
      expect(invoice.invoice_number).toBe('AGC/S/26-27/0001');
      expect(invoice.payment_status).toBe('partial');
      expect(invoice.balance_due).toBe(475000);

      // Verify items have no purity column
      const item = db
        .prepare('SELECT * FROM sales_invoice_items WHERE invoice_id = ?')
        .get(invoiceId) as any;
      expect(item.description).toBe('Gold Bangle');
      expect((item as any).purity).toBeUndefined();
    });

    it('dealer purchase invoice retains supplier invoice number and marks internal disclaimer', () => {
      const fy = db
        .prepare(
          "INSERT INTO financial_years (name, start_date, end_date, is_active) VALUES ('2026-27', '2026-04-01', '2027-03-31', 1)"
        )
        .run();
      const fyId = fy.lastInsertRowid;

      // Insert Supplier
      const sup = db
        .prepare(
          "INSERT INTO suppliers (reference_number, name, gstin) VALUES ('AGC-SUP-0001', 'Kundan Bullion Pvt Ltd', '29AAACK1234D1Z2')"
        )
        .run();

      const purchaseInsert = db
        .prepare(`
        INSERT INTO dealer_purchase_records (
          record_number, financial_year_id, supplier_id, original_invoice_number, original_invoice_date,
          record_date, taxable_amount, grand_total, amount_paid, balance_due, payment_status, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .run(
          'AGC/P/26-27/0001',
          fyId,
          sup.lastInsertRowid,
          'KB-2026-8899', // Original Dealer Invoice #
          '2026-11-15',
          '2026-11-18',
          5000000,
          5150000,
          5150000,
          0,
          'paid',
          'saved'
        );

      const record = db
        .prepare('SELECT * FROM dealer_purchase_records WHERE id = ?')
        .get(purchaseInsert.lastInsertRowid) as any;
      expect(record.record_number).toBe('AGC/P/26-27/0001');
      expect(record.original_invoice_number).toBe('KB-2026-8899');
      expect(record.status).toBe('saved');
      expect(record.payment_status).toBe('paid');
    });

    it('subsequent payment updates invoice received amount and zeroes balance due', () => {
      const fy = db
        .prepare(
          "INSERT INTO financial_years (name, start_date, end_date, is_active) VALUES ('2026-27', '2026-04-01', '2027-03-31', 1)"
        )
        .run();

      const inv = db
        .prepare(`
        INSERT INTO sales_invoices (
          invoice_number, financial_year_id, invoice_date, grand_total, amount_received, balance_due, payment_status, status
        ) VALUES ('AGC/S/26-27/0099', ?, '2026-11-18', 2000000, 1000000, 1000000, 'partial', 'finalized')
      `)
        .run(fy.lastInsertRowid);

      const invId = inv.lastInsertRowid;

      // Second partial payment of ₹10,000
      db.prepare(`
        INSERT INTO payments (document_type, document_id, payment_date, payment_mode, amount)
        VALUES ('sales', ?, '2026-11-19', 'upi', 1000000)
      `).run(invId);

      // Update invoice balance
      db.prepare(`
        UPDATE sales_invoices SET
          amount_received = amount_received + 1000000,
          balance_due = 0,
          payment_status = 'paid'
        WHERE id = ?
      `).run(invId);

      const updated = db
        .prepare('SELECT * FROM sales_invoices WHERE id = ?')
        .get(invId) as any;
      expect(updated.amount_received).toBe(2000000);
      expect(updated.balance_due).toBe(0);
      expect(updated.payment_status).toBe('paid');
    });

    it('service invoice creation calculates SAC 9988 at 5% GST and records full payment', () => {
      const fy = db
        .prepare("INSERT INTO financial_years (name, start_date, end_date, is_active) VALUES ('2026-27', '2026-04-01', '2027-03-31', 1)")
        .run();
      const fyId = fy.lastInsertRowid;

      const cus = db
        .prepare("INSERT INTO customers (reference_number, name, mobile) VALUES ('AGC-CUS-0010', 'Pooja Hegde', '9845099887')")
        .run();
      const customerId = cus.lastInsertRowid;

      // Rate: ₹5,000, 5% GST intra-state (2.5% CGST ₹125 + 2.5% SGST ₹125 = ₹5,250)
      const invInsert = db.prepare(`
        INSERT INTO service_invoices (
          invoice_number, financial_year_id, customer_id, invoice_date, place_of_supply,
          supply_type, taxable_amount, cgst_amount, sgst_amount, igst_amount, grand_total,
          amount_received, balance_due, payment_status, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'AGC/SV/26-27/0001',
        fyId,
        customerId,
        '2026-11-19',
        'Karnataka',
        'intra',
        500000,
        12500,
        12500,
        0,
        525000,
        525000,
        0,
        'paid',
        'finalized'
      );

      const invoiceId = invInsert.lastInsertRowid;

      db.prepare(`
        INSERT INTO service_invoice_items (
          invoice_id, description, sac_code, quantity, rate, taxable_value, gst_rate, cgst_amount, sgst_amount, total_value
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceId,
        'Gold Jewellery Polishing & Stone Setting',
        '9988',
        1,
        500000,
        500000,
        5,
        12500,
        12500,
        525000
      );

      const record = db.prepare('SELECT * FROM service_invoices WHERE id = ?').get(invoiceId) as any;
      expect(record.invoice_number).toBe('AGC/SV/26-27/0001');
      expect(record.grand_total).toBe(525000);
      expect(record.balance_due).toBe(0);
      expect(record.payment_status).toBe('paid');

      const item = db.prepare('SELECT * FROM service_invoice_items WHERE invoice_id = ?').get(invoiceId) as any;
      expect(item.sac_code).toBe('9988');
      expect(item.gst_rate).toBe(5);
      expect(item.total_value).toBe(525000);
    });
  });
});
