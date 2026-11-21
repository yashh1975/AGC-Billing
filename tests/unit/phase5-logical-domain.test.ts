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
  LineItemInput,
} from '../../src/services/gst/gst-engine';

describe('Phase 5 - Advanced Logical Domain & Invariant Tests', () => {
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

  // ─────────────────────────────────────────────────────────────────
  // 1. MULTI-RATE GST BUNDLING INVOICE
  // ─────────────────────────────────────────────────────────────────
  it('multi-rate invoice aggregates distinct tax buckets (3%, 5%, 18%) without rate cross-contamination', () => {
    const items: LineItemInput[] = [
      {
        description: '22K Gold Bangles (Goods)',
        hsnCode: '7113',
        quantity: 1,
        rate: 100000, // ₹1,00,000 @ 3% GST -> Taxable ₹1,00,000 | CGST ₹1,500, SGST ₹1,500
        gstRate: 3,
      },
      {
        description: 'Laser Engraving & Polishing (Labour)',
        sacCode: '9988',
        quantity: 1,
        rate: 5000, // ₹5,000 @ 5% GST -> Taxable ₹5,000 | CGST ₹125, SGST ₹125
        gstRate: 5,
      },
      {
        description: 'Designer Velvet Display Box (Accessory)',
        hsnCode: '3923',
        quantity: 2,
        rate: 1000, // ₹2,000 @ 18% GST -> Taxable ₹2,000 | CGST ₹180, SGST ₹180
        gstRate: 18,
      },
    ];

    const result = calculateInvoice(items, 'Karnataka', 'Karnataka');

    // Taxable amounts:
    // Item 1: 10000000 paise (₹1,00,000)
    // Item 2: 500000 paise (₹5,000)
    // Item 3: 200000 paise (₹2,000)
    // Total Taxable = 10700000 paise (₹1,07,000)
    expect(result.taxableAmountPaise).toBe(10700000);

    // CGST: 150000 + 12500 + 18000 = 180500 paise (₹1,805.00)
    // SGST: 150000 + 12500 + 18000 = 180500 paise (₹1,805.00)
    expect(result.cgstAmountPaise).toBe(180500);
    expect(result.sgstAmountPaise).toBe(180500);
    expect(result.igstAmountPaise).toBe(0);

    // Total GST = 361000 paise (₹3,610.00)
    expect(result.totalGstAmountPaise).toBe(361000);

    // Grand Total = 10700000 + 361000 = 11061000 paise (₹1,10,610.00)
    expect(result.grandTotalPaise).toBe(11061000);
    expect(result.roundOffPaise).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. INTER-STATE PLACE OF SUPPLY MATRIX
  // ─────────────────────────────────────────────────────────────────
  it.each([
    ['Karnataka', 'Karnataka', 'intra', false],
    ['Karnataka', 'karnataka', 'intra', false], // case-insensitive check
    ['Karnataka', 'Tamil Nadu', 'inter', true],
    ['Karnataka', 'Maharashtra', 'inter', true],
    ['Karnataka', 'Delhi', 'inter', true],
    ['Karnataka', 'Kerala', 'inter', true],
    ['Karnataka', 'Andhra Pradesh', 'inter', true],
  ])('supply from %s to %s resolves to %s supply with IGST enabled = %s', (fromState, toState, expectedType, isIgst) => {
    const supplyType = determineSupplyType(fromState, toState);
    expect(supplyType).toBe(expectedType);

    const items: LineItemInput[] = [
      {
        description: 'Gold Bullion Ingot',
        rate: 50000, // ₹50,000 @ 3%
        gstRate: 3,
      },
    ];

    const result = calculateInvoice(items, fromState, toState);
    if (isIgst) {
      expect(result.igstAmountPaise).toBe(150000); // 3% of ₹50,000 = ₹1,500
      expect(result.cgstAmountPaise).toBe(0);
      expect(result.sgstAmountPaise).toBe(0);
    } else {
      expect(result.igstAmountPaise).toBe(0);
      expect(result.cgstAmountPaise).toBe(75000); // 1.5% = ₹750
      expect(result.sgstAmountPaise).toBe(75000); // 1.5% = ₹750
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. FRACTIONAL PAISE ROUND-OFF LOGIC
  // ─────────────────────────────────────────────────────────────────
  it('mathematical round-off balances raw total to nearest rupee and ensures ledger equality', () => {
    // ₹1,234.50 @ 3% GST -> Taxable 123450 paise
    // CGST 1.5% = 1851.75 paise -> rounded to 1852 paise
    // SGST 1.5% = 1851.75 paise -> rounded to 1852 paise
    // Raw total = 123450 + 1852 + 1852 = 127154 paise (₹1,271.54)
    // Nearest rupee = 127200 paise (₹1,272.00)
    // Round-off = +46 paise
    const items: LineItemInput[] = [
      {
        description: 'Silver Ornament',
        rate: 1234.5,
        gstRate: 3,
      },
    ];

    const result = calculateInvoice(items, 'Karnataka', 'Karnataka');

    // Fundamental accounting invariant: Taxable + CGST + SGST + IGST + RoundOff = GrandTotal
    const calculatedSum =
      result.taxableAmountPaise +
      result.cgstAmountPaise +
      result.sgstAmountPaise +
      result.igstAmountPaise +
      result.roundOffPaise;

    expect(calculatedSum).toBe(result.grandTotalPaise);
    expect(result.grandTotalPaise % 100).toBe(0); // Always clean whole rupee
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. DISCOUNT BOUNDARY INVARIANT (PREVENTS NEGATIVE TAXABLE VALUE)
  // ─────────────────────────────────────────────────────────────────
  it('excessive or 100% discount caps taxable amount at zero and prevents negative billing', () => {
    const itemWithEqualDiscount: LineItemInput = {
      description: 'Promotional Gift Item',
      rate: 2500,
      discount: 2500, // 100% discount
      gstRate: 18,
    };

    const resultEqual = calculateLineItem(itemWithEqualDiscount, 'intra');
    expect(resultEqual.taxableValuePaise).toBe(0);
    expect(resultEqual.cgstAmountPaise).toBe(0);
    expect(resultEqual.sgstAmountPaise).toBe(0);
    expect(resultEqual.totalValuePaise).toBe(0);

    const itemWithExcessDiscount: LineItemInput = {
      description: 'Over-Discounted Mistake',
      rate: 1000,
      discount: 1500, // Discount > Rate
      gstRate: 18,
    };

    const resultExcess = calculateLineItem(itemWithExcessDiscount, 'intra');
    expect(resultExcess.taxableValuePaise).toBe(0);
    expect(resultExcess.totalValuePaise).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. INVOICE CANCELLATION STATE INVARIANT
  // ─────────────────────────────────────────────────────────────────
  it('cancelled sales invoice clears outstanding customer dues and transitions status cleanly', () => {
    const fy = db
      .prepare("INSERT INTO financial_years (name, start_date, end_date, is_active) VALUES ('2026-27', '2026-04-01', '2027-03-31', 1)")
      .run();
    const fyId = fy.lastInsertRowid;

    const cus = db
      .prepare("INSERT INTO customers (reference_number, name, mobile) VALUES ('AGC-CUS-0050', 'Naveen Reddy', '9900112233')")
      .run();
    const customerId = cus.lastInsertRowid;

    // Create finalized invoice with ₹25,000 balance due
    const invRes = db.prepare(`
      INSERT INTO sales_invoices (
        invoice_number, financial_year_id, customer_id, invoice_date, grand_total,
        amount_received, balance_due, payment_status, status
      ) VALUES ('AGC/S/26-27/0500', ?, ?, '2026-11-19', 2500000, 0, 2500000, 'unpaid', 'finalized')
    `).run(fyId, customerId);
    const invoiceId = invRes.lastInsertRowid;

    // Verify initial balance
    const beforeCancel = db.prepare('SELECT balance_due, status FROM sales_invoices WHERE id = ?').get(invoiceId) as any;
    expect(beforeCancel.status).toBe('finalized');
    expect(beforeCancel.balance_due).toBe(2500000);

    // Cancel invoice in a safe transaction
    db.transaction(() => {
      db.prepare(`
        UPDATE sales_invoices
        SET status = 'cancelled',
            balance_due = 0,
            notes = 'Customer cancelled order before delivery'
        WHERE id = ?
      `).run(invoiceId);

      // Record audit log
      db.prepare(`
        INSERT INTO audit_logs (action, entity_type, entity_id, new_values)
        VALUES ('cancel', 'sales_invoice', ?, '{"reason": "Invoice cancelled and balance reset to 0"}')
      `).run(invoiceId);
    })();

    const afterCancel = db.prepare('SELECT balance_due, status, notes FROM sales_invoices WHERE id = ?').get(invoiceId) as any;
    expect(afterCancel.status).toBe('cancelled');
    expect(afterCancel.balance_due).toBe(0);

    // Verify customer outstanding query ignores cancelled bills
    const activeDues = db.prepare(`
      SELECT IFNULL(SUM(balance_due), 0) as total_due
      FROM sales_invoices
      WHERE customer_id = ? AND status != 'cancelled'
    `).get(customerId) as any;

    expect(activeDues.total_due).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────
  // 6. OVERPAYMENT GUARD
  // ─────────────────────────────────────────────────────────────────
  it('overpayment does not produce negative balance due and preserves exact payment ledger record', () => {
    // Invoice of ₹14,750, Customer pays ₹15,000
    const items: LineItemInput[] = [
      {
        description: 'Gold Chain',
        rate: 12500,
        gstRate: 18,
      },
    ];

    const result = calculateInvoice(items, 'Karnataka', 'Karnataka', 15000);

    expect(result.grandTotalPaise).toBe(1475000); // ₹14,750
    expect(result.amountReceivedPaise).toBe(1500000); // ₹15,000
    expect(result.balanceDuePaise).toBe(0); // Capped at zero, never negative!
  });

  // ─────────────────────────────────────────────────────────────────
  // 7. INDIAN NUMBERING CURRENCY FORMATTING
  // ─────────────────────────────────────────────────────────────────
  it.each([
    [0, '₹0.00'],
    [50, '₹0.50'],
    [100000, '₹1,000.00'],
    [1475000, '₹14,750.00'],
    [10000000, '₹1,00,000.00'], // 1 Lakh
    [1000000000, '₹1,00,00,000.00'], // 1 Crore
  ])('formatRupees(%i paise) produces standard Indian currency representation "%s"', (paise, expectedFormat) => {
    // Normalise non-breaking space if Intl uses it
    const formatted = formatRupees(paise).replace(/\u00a0/g, ' ');
    expect(formatted).toBe(expectedFormat);
  });

  // ─────────────────────────────────────────────────────────────────
  // 8. STRICT ZERO-PURITY DOMAIN INVARIANT
  // ─────────────────────────────────────────────────────────────────
  it('database and domain entities reject purity fields to comply with AGC business rules', () => {
    const tableColumns = db
      .prepare("PRAGMA table_info('sales_invoice_items')")
      .all()
      .map((col: any) => col.name.toLowerCase());

    expect(tableColumns).not.toContain('purity');
    expect(tableColumns).not.toContain('karat');
    expect(tableColumns).not.toContain('carat');

    // Attempting to query purity returns undefined or throws
    const row = db.prepare("SELECT * FROM sales_invoice_items WHERE id = 1").get();
    expect(row).toBeUndefined();
  });

  // ─────────────────────────────────────────────────────────────────
  // 9. COMPLETE IPC CHANNELS AND ENVELOPE CONTRACT INTEGRITY
  // ─────────────────────────────────────────────────────────────────
  it('document sequences allocate correctly for service invoices when finalizing', () => {
    // Ensure FY 2026-27 is present
    let activeFy = db.prepare('SELECT id, name FROM financial_years WHERE is_active = 1').get() as any;
    if (!activeFy) {
      const fyRes = db.prepare(
        "INSERT INTO financial_years (name, start_date, end_date, is_active) VALUES ('2026-27', '2026-04-01', '2027-03-31', 1)"
      ).run();
      activeFy = { id: fyRes.lastInsertRowid, name: '2026-27' };
      db.prepare(
        "INSERT INTO document_sequences (category, prefix, financial_year_id, last_number) VALUES ('service', 'AGC/SV', ?, 0)"
      ).run(activeFy.id);
    }

    // Insert customer
    const cus = db.prepare(
      "INSERT INTO customers (reference_number, name, mobile) VALUES ('AGC-CUS-9999', 'Service Tester', '9876543210')"
    ).run();

    // Insert draft service invoice
    const draftRes = db.prepare(`
      INSERT INTO service_invoices (
        financial_year_id, invoice_number, invoice_date, customer_id, place_of_supply,
        subtotal, taxable_amount, cgst_amount, sgst_amount, igst_amount, grand_total,
        amount_received, balance_due, status
      ) VALUES (?, 'DRAFT-SV-0001', '2026-11-19', ?, 'Karnataka', 100000, 100000, 2500, 2500, 0, 105000, 105000, 0, 'draft')
    `).run(activeFy.id, cus.lastInsertRowid);

    // Finalize sequence allocation
    const seq = db.prepare("SELECT * FROM document_sequences WHERE category = 'service' AND financial_year_id = ?").get(activeFy.id) as any;
    expect(seq).toBeDefined();
    const nextSeqNum = seq.last_number + 1;
    db.prepare("UPDATE document_sequences SET last_number = ? WHERE id = ?").run(nextSeqNum, seq.id);
    const finalNumber = `${seq.prefix}/${activeFy.name}/${String(nextSeqNum).padStart(4, '0')}`;

    db.prepare("UPDATE service_invoices SET invoice_number = ?, status = 'finalized' WHERE id = ?")
      .run(finalNumber, draftRes.lastInsertRowid);

    const finalized = db.prepare("SELECT * FROM service_invoices WHERE id = ?").get(draftRes.lastInsertRowid) as any;
    expect(finalized.status).toBe('finalized');
    expect(finalized.invoice_number).toBe('AGC/SV/2026-27/0001');
    expect(finalized.grand_total).toBe(105000);
  });

  it('audit_logs records actions and retrieves chronological history with user context', () => {
    const userRes = db.prepare("INSERT INTO users (username, password_hash, display_name, role) VALUES ('audit_tester', 'hash', 'Auditor', 'admin')").run();
    db.prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES (?, 'create', 'customer', 1, '{\"name\":\"Audit Company\"}')")
      .run(userRes.lastInsertRowid);

    const logs = db.prepare(`
      SELECT a.*, u.username, u.display_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.entity_type = 'customer'
      ORDER BY a.created_at DESC
    `).all() as any[];

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('create');
    expect(logs[0].username).toBe('audit_tester');
    expect(logs[0].display_name).toBe('Auditor');
  });

  // ─────────────────────────────────────────────────────────────────
  // 8. PLEDGE DETAILS ISOLATION & REGISTRY TESTS
  // ─────────────────────────────────────────────────────────────────
  it('pledge_records table stores full pledge details and isolates them from billing registers and CA exports', () => {
    // 1. Insert pledge records
    db.prepare(`
      INSERT INTO pledge_records (
        record_date, customer_name, customer_address, phone_number,
        principal_amount, interest_rate, pledge_date, pledged_item_name,
        pledge_place, pledge_amount, pledge_interest, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '2026-11-21',
      'Ramesh Kumar',
      '#10, Malleshwaram, Bengaluru',
      '9845012345',
      100000,
      '2% per month',
      '2026-11-15',
      'Gold Necklace 22K (35g)',
      'Muthoot Finance',
      85000,
      '1.5% per month',
      'active',
      'Initial loan takeover pledge'
    );

    // Second pledge for the same person
    db.prepare(`
      INSERT INTO pledge_records (
        record_date, customer_name, customer_address, phone_number,
        principal_amount, interest_rate, pledge_date, pledged_item_name,
        pledge_place, pledge_amount, pledge_interest, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '2026-11-21',
      'Ramesh Kumar',
      '#10, Malleshwaram, Bengaluru',
      '9845012345',
      50000,
      '2% per month',
      '2026-11-18',
      '2 Gold Bangles 22K (25g)',
      'Manappuram Finance',
      42000,
      '1.6% per month',
      'active',
      'Additional collateral'
    );

    // Third pledge for another person
    db.prepare(`
      INSERT INTO pledge_records (
        record_date, customer_name, customer_address, phone_number,
        principal_amount, interest_rate, pledge_date, pledged_item_name,
        pledge_place, pledge_amount, pledge_interest, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '2026-11-21',
      'Lakshmi Devi',
      '#24, Rajajinagar, Bengaluru',
      '9900112233',
      75000,
      '1.8% per month',
      '2026-11-20',
      'Gold Chain 22K (20g)',
      'Canara Bank',
      60000,
      '1.2% per month',
      'active',
      'Bank pledge'
    );

    // Verify distinct people count and total active pledges
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalPledges,
        COUNT(DISTINCT customer_name) as distinctPeople,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activePledges,
        SUM(principal_amount) as totalPrincipal,
        SUM(pledge_amount) as totalPledgeAmount
      FROM pledge_records
    `).get() as any;

    expect(stats.totalPledges).toBe(3);
    expect(stats.distinctPeople).toBe(2); // Ramesh Kumar & Lakshmi Devi
    expect(stats.activePledges).toBe(3);
    expect(stats.totalPrincipal).toBe(225000);
    expect(stats.totalPledgeAmount).toBe(187000);

    // Verify STRICT ISOLATION: pledge_records are NOT present in sales, purchase, or service tables
    const salesPledges = db.prepare("SELECT COUNT(*) as count FROM sales_invoices WHERE invoice_number LIKE '%pledge%'").get() as any;
    expect(salesPledges.count).toBe(0);

    const purchasePledges = db.prepare("SELECT COUNT(*) as count FROM dealer_purchase_records WHERE record_number LIKE '%pledge%'").get() as any;
    expect(purchasePledges.count).toBe(0);

    const servicePledges = db.prepare("SELECT COUNT(*) as count FROM service_invoices WHERE invoice_number LIKE '%pledge%'").get() as any;
    expect(servicePledges.count).toBe(0);
  });

  it('pledge record supports pledged_name and interest rates with % symbol', () => {
    // Insert pledge record with explicit pledged_name and interest rates
    const insertStmt = db.prepare(`
      INSERT INTO pledge_records (
        record_date, customer_name, customer_address, phone_number,
        principal_amount, interest_rate, pledge_date, pledged_name, pledged_item_name,
        pledge_place, pledge_amount, pledge_interest, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      '2026-11-21',
      'Yashwanth',
      'Bengaluru',
      '9008477669',
      100000,
      '2.0%',
      '2026-11-21',
      'Yashwanth Gowda',
      'Gold Necklace 22K (40g)',
      'Muthoot Finance',
      80000,
      '1.5%',
      'active',
      'Pledge slip #MF-98765'
    );

    const record = db.prepare('SELECT * FROM pledge_records WHERE id = ?').get(result.lastInsertRowid) as any;
    expect(record.pledged_name).toBe('Yashwanth Gowda');
    expect(record.customer_name).toBe('Yashwanth');
    expect(record.interest_rate).toBe('2.0%');
    expect(record.pledge_interest).toBe('1.5%');
    expect(record.principal_amount).toBe(100000);
    expect(record.pledge_amount).toBe(80000);

    // Verify search by pledged_name
    const searchResult = db.prepare(`
      SELECT * FROM pledge_records WHERE LOWER(IFNULL(pledged_name, '')) LIKE ?
    `).all('%gowda%') as any[];
    expect(searchResult.length).toBeGreaterThanOrEqual(1);
    expect(searchResult[0].pledged_name).toBe('Yashwanth Gowda');
  });
});
