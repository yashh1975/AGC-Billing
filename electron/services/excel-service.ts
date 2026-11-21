import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { getDb } from '../database';
import { getFileManager } from '../file-manager';

export interface ReportFilter {
  fyId?: number;
  period?: 'full' | 'q1' | 'q2' | 'q3' | 'q4' | 'month' | 'custom';
  month?: number; // 1-12
  fromDate?: string;
  toDate?: string;
  type?: 'all' | 'sales' | 'purchases' | 'services' | 'summary' | 'hsn';
}

export class ExcelService {
  /**
   * Main export method: Generates the requested Excel report workbook
   */
  async generateReport(filter: ReportFilter, customDb?: any): Promise<{ filePath: string; fileName: string }> {
    const db = customDb || getDb();
    const fileMgr = getFileManager();

    // 1. Fetch Company Profile
    const company = (db.prepare('SELECT * FROM company_profile ORDER BY id DESC LIMIT 1').get() as any) || {
      business_name: 'ANJANEYA GOLD COMPANY',
      gstin: '29ACKFA4620Q1ZV',
      address: '#20, 1ST FLOOR, SARASWATHIPURA MAIN ROAD, OPP. SATHYA SHANTHI GANAPATHI TEMPLE, NANDINI LAYOUT',
      city: 'Bengaluru',
      state: 'Karnataka',
    };

    // 2. Fetch Financial Year info
    let fyName = '2026-27';
    if (filter.fyId) {
      const fy = db.prepare('SELECT name FROM financial_years WHERE id = ?').get(filter.fyId) as any;
      if (fy) fyName = fy.name;
    } else {
      const fy = db.prepare('SELECT name FROM financial_years WHERE is_active = 1 LIMIT 1').get() as any;
      if (fy) fyName = fy.name;
    }

    // 3. Resolve Date Boundaries
    let fromDate = filter.fromDate;
    let toDate = filter.toDate;
    const fyParts = fyName.split('-');
    const startYear = parseInt(fyParts[0]?.length === 4 ? fyParts[0] : `20${fyParts[0]}`, 10) || 2026;
    const endYear = startYear + 1;

    if (filter.period === 'q1') {
      fromDate = `${startYear}-04-01`;
      toDate = `${startYear}-06-30`;
    } else if (filter.period === 'q2') {
      fromDate = `${startYear}-07-01`;
      toDate = `${startYear}-09-30`;
    } else if (filter.period === 'q3') {
      fromDate = `${startYear}-10-01`;
      toDate = `${startYear}-12-31`;
    } else if (filter.period === 'q4') {
      fromDate = `${endYear}-01-01`;
      toDate = `${endYear}-03-31`;
    } else if (filter.period === 'month' && filter.month) {
      const m = filter.month;
      const yr = m >= 4 ? startYear : endYear;
      const mStr = String(m).padStart(2, '0');
      const lastDay = new Date(yr, m, 0).getDate();
      fromDate = `${yr}-${mStr}-01`;
      toDate = `${yr}-${mStr}-${String(lastDay).padStart(2, '0')}`;
    } else if (filter.period === 'full' || (!fromDate && !toDate)) {
      fromDate = `${startYear}-04-01`;
      toDate = `${endYear}-03-31`;
    }

    // Initialize Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AGC Billing & Management System';
    workbook.lastModifiedBy = company.business_name;
    workbook.created = new Date();
    workbook.modified = new Date();

    const reportType = filter.type || 'all';

    // Build Sheets based on reportType
    if (reportType === 'all' || reportType === 'sales') {
      await this.buildSalesRegister(workbook, db, fyName, fromDate, toDate, company);
    }

    if (reportType === 'all' || reportType === 'purchases') {
      await this.buildDealerPurchaseRegister(workbook, db, fyName, fromDate, toDate, company);
    }

    if (reportType === 'all' || reportType === 'services') {
      await this.buildServiceRegister(workbook, db, fyName, fromDate, toDate, company);
    }

    if (reportType === 'all' || reportType === 'summary') {
      await this.buildGstSummarySheet(workbook, db, fyName, fromDate, toDate, company);
    }

    if (reportType === 'all' || reportType === 'hsn') {
      await this.buildHsnSacSummarySheet(workbook, db, fyName, fromDate, toDate, company);
    }

    // Determine target save directory: AGC_Billing/GST_Reports/{FinancialYear}/
    const rootDir = fileMgr.getDataDirectory();
    const reportsDir = path.join(rootDir, 'GST_Reports', fyName.replace('/', '-'));
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const periodLabel = filter.period ? `_${filter.period.toUpperCase()}` : '';
    const typeLabel = reportType.toUpperCase();
    const fileName = `AGC_GST_${typeLabel}_${fyName.replace('/', '-')}${periodLabel}_${timestamp}.xlsx`;
    const filePath = path.join(reportsDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    return { filePath, fileName };
  }

  // ─────────────────────────────────────────────────────────────────
  // SHEET 1: SALES REGISTER (STRICTLY NO GOLD PURITY)
  // ─────────────────────────────────────────────────────────────────
  private async buildSalesRegister(
    workbook: ExcelJS.Workbook,
    db: any,
    fyName: string,
    fromDate?: string,
    toDate?: string,
    company?: any
  ) {
    const sheet = workbook.addWorksheet('Sales Register', {
      views: [{ state: 'frozen', ySplit: 5 }],
    });

    this.addHeaderBlock(sheet, 'SALES REGISTER - OUTWARD TAXABLE SUPPLIES', company, fyName, fromDate, toDate);

    sheet.getRow(5).values = [
      'FY',
      'Invoice No',
      'Invoice Date',
      'Customer Name',
      'Customer Ref',
      'Customer GSTIN',
      'Customer State',
      'Place of Supply',
      'Item Description',
      'HSN Code',
      'Qty',
      'Gross Wt (g)',
      'Net Wt (g)',
      'Rate (₹)',
      'Making Charges (₹)',
      'Other Charges (₹)',
      'Discount (₹)',
      'Taxable Value (₹)',
      'CGST Rate %',
      'CGST (₹)',
      'SGST Rate %',
      'SGST (₹)',
      'IGST Rate %',
      'IGST (₹)',
      'Round Off (₹)',
      'Total Amount (₹)',
      'Amount Received (₹)',
      'Balance Due (₹)',
      'Payment Status',
    ];
    this.styleTableHeader(sheet.getRow(5));

    let query = `
      SELECT s.*, c.name as customer_name, c.reference_number as customer_reference,
             c.gstin as customer_gstin, c.state as customer_state,
             i.description as item_desc, i.hsn_code, i.quantity as item_qty,
             i.gross_weight, i.net_weight, (i.rate / 100.0) as item_rate,
             (i.making_charges / 100.0) as item_making,
             (i.other_charges / 100.0) as item_other,
             (i.discount / 100.0) as item_discount,
             (i.taxable_value / 100.0) as item_taxable,
             CASE WHEN s.supply_type = 'inter' THEN 0 ELSE (i.gst_rate / 2.0) END as cgst_rate,
             (i.cgst_amount / 100.0) as item_cgst,
             CASE WHEN s.supply_type = 'inter' THEN 0 ELSE (i.gst_rate / 2.0) END as sgst_rate,
             (i.sgst_amount / 100.0) as item_sgst,
             CASE WHEN s.supply_type = 'inter' THEN i.gst_rate ELSE 0 END as igst_rate,
             (i.igst_amount / 100.0) as item_igst,
             (i.total_value / 100.0) as item_total,
             (s.round_off / 100.0) as inv_round_off,
             (s.grand_total / 100.0) as inv_total,
             (s.amount_received / 100.0) as inv_received,
             (s.balance_due / 100.0) as inv_balance
      FROM sales_invoices s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sales_invoice_items i ON s.id = i.invoice_id
      WHERE s.status NOT IN ('cancelled', 'draft')
    `;
    const params: any[] = [];
    if (fromDate) { query += ' AND s.invoice_date >= ?'; params.push(fromDate); }
    if (toDate) { query += ' AND s.invoice_date <= ?'; params.push(toDate); }
    query += ' ORDER BY s.invoice_date ASC, s.invoice_number ASC, i.sort_order ASC';

    const rows = db.prepare(query).all(...params) as any[];

    let rowIndex = 6;
    for (const r of rows) {
      const row = sheet.getRow(rowIndex);
      row.values = [
        fyName,
        r.invoice_number,
        r.invoice_date,
        r.customer_name || 'Walk-in Customer',
        r.customer_reference || 'N/A',
        r.customer_gstin || 'URP',
        r.customer_state || 'Karnataka',
        r.place_of_supply || 'Karnataka',
        r.item_desc || 'Gold Jewellery',
        r.hsn_code || '7113',
        r.item_qty || 1,
        r.gross_weight ? Number(r.gross_weight) : 0,
        r.net_weight ? Number(r.net_weight) : 0,
        r.item_rate ? Number(r.item_rate) : 0,
        r.item_making ? Number(r.item_making) : 0,
        r.item_other ? Number(r.item_other) : 0,
        r.item_discount ? Number(r.item_discount) : 0,
        r.item_taxable ? Number(r.item_taxable) : 0,
        r.cgst_rate ? Number(r.cgst_rate) : 0,
        r.item_cgst ? Number(r.item_cgst) : 0,
        r.sgst_rate ? Number(r.sgst_rate) : 0,
        r.item_sgst ? Number(r.item_sgst) : 0,
        r.igst_rate ? Number(r.igst_rate) : 0,
        r.item_igst ? Number(r.item_igst) : 0,
        r.inv_round_off ? Number(r.inv_round_off) : 0,
        r.item_total ? Number(r.item_total) : (r.inv_total || 0),
        r.inv_received ? Number(r.inv_received) : 0,
        r.inv_balance ? Number(r.inv_balance) : 0,
        (r.payment_status || 'unpaid').toUpperCase(),
      ];

      row.getCell(12).numFmt = '0.000';
      row.getCell(13).numFmt = '0.000';
      for (const colIdx of [14, 15, 16, 17, 18, 20, 22, 24, 25, 26, 27, 28]) {
        row.getCell(colIdx).numFmt = '#,##0.00';
      }
      rowIndex++;
    }

    if (rows.length > 0) {
      const totRow = sheet.getRow(rowIndex);
      totRow.values = [
        'TOTALS', '', '', '', '', '', '', '', '', '',
        { formula: `SUM(K6:K${rowIndex - 1})` },
        { formula: `SUM(L6:L${rowIndex - 1})` },
        { formula: `SUM(M6:M${rowIndex - 1})` },
        '', '', '',
        { formula: `SUM(Q6:Q${rowIndex - 1})` },
        { formula: `SUM(R6:R${rowIndex - 1})` },
        '',
        { formula: `SUM(T6:T${rowIndex - 1})` },
        '',
        { formula: `SUM(V6:V${rowIndex - 1})` },
        '',
        { formula: `SUM(X6:X${rowIndex - 1})` },
        { formula: `SUM(Y6:Y${rowIndex - 1})` },
        { formula: `SUM(Z6:Z${rowIndex - 1})` },
        { formula: `SUM(AA6:AA${rowIndex - 1})` },
        { formula: `SUM(AB6:AB${rowIndex - 1})` },
        '',
      ];
      this.styleTotalsRow(totRow);
    }

    this.autoFitColumns(sheet);
  }

  // ─────────────────────────────────────────────────────────────────
  // SHEET 2: DEALER PURCHASE REGISTER (INTERNAL RECORD - NOT TAX INVOICE)
  // ─────────────────────────────────────────────────────────────────
  private async buildDealerPurchaseRegister(
    workbook: ExcelJS.Workbook,
    db: any,
    fyName: string,
    fromDate?: string,
    toDate?: string,
    company?: any
  ) {
    const sheet = workbook.addWorksheet('Dealer Purchases', {
      views: [{ state: 'frozen', ySplit: 5 }],
    });

    this.addHeaderBlock(sheet, 'DEALER PURCHASE REGISTER (INTERNAL RECORD - NOT TAX INVOICE)', company, fyName, fromDate, toDate);

    sheet.getRow(5).values = [
      'FY',
      'AGC Internal Ref',
      'Dealer Bill No',
      'Dealer Bill Date',
      'AGC Record Date',
      'Supplier Name',
      'Supplier Ref',
      'Supplier GSTIN',
      'Supplier State',
      'Item Description',
      'HSN Code',
      'Qty',
      'Gross Wt (g)',
      'Net Wt (g)',
      'Taxable Value (₹)',
      'CGST Rate %',
      'CGST (₹)',
      'SGST Rate %',
      'SGST (₹)',
      'IGST Rate %',
      'IGST (₹)',
      'Total Amount (₹)',
      'Amount Paid (₹)',
      'Balance Due (₹)',
      'Payment Status',
    ];
    this.styleTableHeader(sheet.getRow(5));

    let query = `
      SELECT p.*, s.name as supplier_name, s.reference_number as supplier_reference,
             s.gstin as supplier_gstin, s.state as supplier_state,
             i.description as item_desc, i.hsn_code, i.quantity as item_qty,
             i.gross_weight, i.net_weight,
             (i.taxable_value / 100.0) as item_taxable,
             (i.gst_rate / 2.0) as cgst_rate, (i.cgst_amount / 100.0) as item_cgst,
             (i.gst_rate / 2.0) as sgst_rate, (i.sgst_amount / 100.0) as item_sgst,
             i.gst_rate as igst_rate, (i.igst_amount / 100.0) as item_igst,
             (i.total_value / 100.0) as item_total,
             (p.grand_total / 100.0) as purch_total,
             (p.amount_paid / 100.0) as purch_paid,
             (p.balance_due / 100.0) as purch_balance
      FROM dealer_purchase_records p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN dealer_purchase_items i ON p.id = i.purchase_id
      WHERE p.status NOT IN ('cancelled', 'draft')
    `;
    const params: any[] = [];
    if (fromDate) { query += ' AND p.record_date >= ?'; params.push(fromDate); }
    if (toDate) { query += ' AND p.record_date <= ?'; params.push(toDate); }
    query += ' ORDER BY p.record_date ASC, p.record_number ASC, i.sort_order ASC';

    const rows = db.prepare(query).all(...params) as any[];

    let rowIndex = 6;
    for (const r of rows) {
      const row = sheet.getRow(rowIndex);
      row.values = [
        fyName,
        r.record_number,
        r.original_invoice_number || 'N/A',
        r.original_invoice_date || 'N/A',
        r.record_date,
        r.supplier_name,
        r.supplier_reference || 'N/A',
        r.supplier_gstin || 'N/A',
        r.supplier_state || 'Karnataka',
        r.item_desc || 'Gold Jewellery / Bullion',
        r.hsn_code || '7113',
        r.item_qty || 1,
        r.gross_weight ? Number(r.gross_weight) : 0,
        r.net_weight ? Number(r.net_weight) : 0,
        r.item_taxable ? Number(r.item_taxable) : 0,
        r.cgst_rate ? Number(r.cgst_rate) : 0,
        r.item_cgst ? Number(r.item_cgst) : 0,
        r.sgst_rate ? Number(r.sgst_rate) : 0,
        r.item_sgst ? Number(r.item_sgst) : 0,
        r.igst_rate ? Number(r.igst_rate) : 0,
        r.item_igst ? Number(r.item_igst) : 0,
        r.item_total ? Number(r.item_total) : (r.purch_total || 0),
        r.purch_paid ? Number(r.purch_paid) : 0,
        r.purch_balance ? Number(r.purch_balance) : 0,
        (r.payment_status || 'unpaid').toUpperCase(),
      ];

      row.getCell(13).numFmt = '0.000';
      row.getCell(14).numFmt = '0.000';
      for (const colIdx of [15, 17, 19, 21, 22, 23, 24]) {
        row.getCell(colIdx).numFmt = '#,##0.00';
      }
      rowIndex++;
    }

    if (rows.length > 0) {
      const totRow = sheet.getRow(rowIndex);
      totRow.values = [
        'TOTALS', '', '', '', '', '', '', '', '', '', '',
        { formula: `SUM(L6:L${rowIndex - 1})` },
        { formula: `SUM(M6:M${rowIndex - 1})` },
        { formula: `SUM(N6:N${rowIndex - 1})` },
        { formula: `SUM(O6:O${rowIndex - 1})` },
        '',
        { formula: `SUM(Q6:Q${rowIndex - 1})` },
        '',
        { formula: `SUM(S6:S${rowIndex - 1})` },
        '',
        { formula: `SUM(U6:U${rowIndex - 1})` },
        { formula: `SUM(V6:V${rowIndex - 1})` },
        { formula: `SUM(W6:W${rowIndex - 1})` },
        { formula: `SUM(X6:X${rowIndex - 1})` },
        '',
      ];
      this.styleTotalsRow(totRow);
    }

    this.autoFitColumns(sheet);
  }

  // ─────────────────────────────────────────────────────────────────
  // SHEET 3: SERVICE REGISTER
  // ─────────────────────────────────────────────────────────────────
  private async buildServiceRegister(
    workbook: ExcelJS.Workbook,
    db: any,
    fyName: string,
    fromDate?: string,
    toDate?: string,
    company?: any
  ) {
    const sheet = workbook.addWorksheet('Service Register', {
      views: [{ state: 'frozen', ySplit: 5 }],
    });

    this.addHeaderBlock(sheet, 'SERVICE REGISTER - FINANCIAL SERVICES (GOLD LOAN TAKEOVER & RE-PLEDGING)', company, fyName, fromDate, toDate);

    sheet.getRow(5).values = [
      'FY',
      'Service Inv No',
      'Invoice Date',
      'Customer Name',
      'Customer Ref',
      'Customer GSTIN',
      'Place of Supply',
      'Service Description',
      'SAC Code',
      'Qty',
      'Rate (₹)',
      'Discount (₹)',
      'Taxable Value (₹)',
      'CGST Rate %',
      'CGST (₹)',
      'SGST Rate %',
      'SGST (₹)',
      'IGST Rate %',
      'IGST (₹)',
      'Total Amount (₹)',
      'Amount Received (₹)',
      'Balance Due (₹)',
      'Payment Status',
    ];
    this.styleTableHeader(sheet.getRow(5));

    let query = `
      SELECT sv.*, c.name as customer_name, c.reference_number as customer_reference,
             c.gstin as customer_gstin,
             i.description as item_desc, i.sac_code, i.quantity as item_qty,
             (i.rate / 100.0) as item_rate,
             (i.discount / 100.0) as item_discount,
             (i.taxable_value / 100.0) as item_taxable,
             CASE WHEN sv.supply_type = 'inter' THEN 0 ELSE (i.gst_rate / 2.0) END as cgst_rate,
             (i.cgst_amount / 100.0) as item_cgst,
             CASE WHEN sv.supply_type = 'inter' THEN 0 ELSE (i.gst_rate / 2.0) END as sgst_rate,
             (i.sgst_amount / 100.0) as item_sgst,
             CASE WHEN sv.supply_type = 'inter' THEN i.gst_rate ELSE 0 END as igst_rate,
             (i.igst_amount / 100.0) as item_igst,
             (i.total_value / 100.0) as item_total,
             (sv.grand_total / 100.0) as serv_total,
             (sv.amount_received / 100.0) as serv_received,
             (sv.balance_due / 100.0) as serv_balance
      FROM service_invoices sv
      LEFT JOIN customers c ON sv.customer_id = c.id
      LEFT JOIN service_invoice_items i ON sv.id = i.invoice_id
      WHERE sv.status NOT IN ('cancelled', 'draft')
    `;
    const params: any[] = [];
    if (fromDate) { query += ' AND sv.invoice_date >= ?'; params.push(fromDate); }
    if (toDate) { query += ' AND sv.invoice_date <= ?'; params.push(toDate); }
    query += ' ORDER BY sv.invoice_date ASC, sv.invoice_number ASC, i.sort_order ASC';

    const rows = db.prepare(query).all(...params) as any[];

    let rowIndex = 6;
    for (const r of rows) {
      const row = sheet.getRow(rowIndex);
      row.values = [
        fyName,
        r.invoice_number,
        r.invoice_date,
        r.customer_name || 'Customer',
        r.customer_reference || 'N/A',
        r.customer_gstin || 'URP',
        r.place_of_supply || 'Karnataka',
        r.item_desc || 'Gold Loan Takeover / Financial Service Charges',
        r.sac_code || '9971',
        r.item_qty || 1,
        r.item_rate ? Number(r.item_rate) : 0,
        r.item_discount ? Number(r.item_discount) : 0,
        r.item_taxable ? Number(r.item_taxable) : 0,
        r.cgst_rate ? Number(r.cgst_rate) : 0,
        r.item_cgst ? Number(r.item_cgst) : 0,
        r.sgst_rate ? Number(r.sgst_rate) : 0,
        r.item_sgst ? Number(r.item_sgst) : 0,
        r.igst_rate ? Number(r.igst_rate) : 0,
        r.item_igst ? Number(r.item_igst) : 0,
        r.item_total ? Number(r.item_total) : (r.serv_total || 0),
        r.serv_received ? Number(r.serv_received) : 0,
        r.serv_balance ? Number(r.serv_balance) : 0,
        (r.payment_status || 'unpaid').toUpperCase(),
      ];

      for (const colIdx of [11, 12, 13, 15, 17, 19, 20, 21, 22]) {
        row.getCell(colIdx).numFmt = '#,##0.00';
      }
      rowIndex++;
    }

    if (rows.length > 0) {
      const totRow = sheet.getRow(rowIndex);
      totRow.values = [
        'TOTALS', '', '', '', '', '', '', '', '',
        { formula: `SUM(J6:J${rowIndex - 1})` },
        '', '',
        { formula: `SUM(M6:M${rowIndex - 1})` },
        '',
        { formula: `SUM(O6:O${rowIndex - 1})` },
        '',
        { formula: `SUM(Q6:Q${rowIndex - 1})` },
        '',
        { formula: `SUM(S6:S${rowIndex - 1})` },
        { formula: `SUM(T6:T${rowIndex - 1})` },
        { formula: `SUM(U6:U${rowIndex - 1})` },
        { formula: `SUM(V6:V${rowIndex - 1})` },
        '',
      ];
      this.styleTotalsRow(totRow);
    }

    this.autoFitColumns(sheet);
  }

  // ─────────────────────────────────────────────────────────────────
  // SHEET 4: GST SUMMARY (OUTWARD VS INWARD FOR CA RECONCILIATION)
  // ─────────────────────────────────────────────────────────────────
  private async buildGstSummarySheet(
    workbook: ExcelJS.Workbook,
    db: any,
    fyName: string,
    fromDate?: string,
    toDate?: string,
    company?: any
  ) {
    const sheet = workbook.addWorksheet('GST Tax Summary', {
      views: [{ state: 'normal' }],
    });

    this.addHeaderBlock(sheet, 'GST TAX SUMMARY & CA FILING RECONCILIATION', company, fyName, fromDate, toDate);

    // Queries for Totals (dividing paise by 100.0)
    const salesTotals = db.prepare(`
      SELECT COUNT(*) as doc_count,
             IFNULL(SUM(taxable_amount) / 100.0, 0) as taxable,
             IFNULL(SUM(cgst_amount) / 100.0, 0) as cgst,
             IFNULL(SUM(sgst_amount) / 100.0, 0) as sgst,
             IFNULL(SUM(igst_amount) / 100.0, 0) as igst,
             IFNULL(SUM(cgst_amount + sgst_amount + igst_amount) / 100.0, 0) as total_tax,
             IFNULL(SUM(grand_total) / 100.0, 0) as total_amount
      FROM sales_invoices
      WHERE status NOT IN ('cancelled', 'draft')
        AND (? IS NULL OR invoice_date >= ?)
        AND (? IS NULL OR invoice_date <= ?)
    `).get(fromDate || null, fromDate || null, toDate || null, toDate || null) as any;

    const serviceTotals = db.prepare(`
      SELECT COUNT(*) as doc_count,
             IFNULL(SUM(taxable_amount) / 100.0, 0) as taxable,
             IFNULL(SUM(cgst_amount) / 100.0, 0) as cgst,
             IFNULL(SUM(sgst_amount) / 100.0, 0) as sgst,
             IFNULL(SUM(igst_amount) / 100.0, 0) as igst,
             IFNULL(SUM(cgst_amount + sgst_amount + igst_amount) / 100.0, 0) as total_tax,
             IFNULL(SUM(grand_total) / 100.0, 0) as total_amount
      FROM service_invoices
      WHERE status NOT IN ('cancelled', 'draft')
        AND (? IS NULL OR invoice_date >= ?)
        AND (? IS NULL OR invoice_date <= ?)
    `).get(fromDate || null, fromDate || null, toDate || null, toDate || null) as any;

    const purchaseTotals = db.prepare(`
      SELECT COUNT(*) as doc_count,
             IFNULL(SUM(taxable_amount) / 100.0, 0) as taxable,
             IFNULL(SUM(cgst_amount) / 100.0, 0) as cgst,
             IFNULL(SUM(sgst_amount) / 100.0, 0) as sgst,
             IFNULL(SUM(igst_amount) / 100.0, 0) as igst,
             IFNULL(SUM(cgst_amount + sgst_amount + igst_amount) / 100.0, 0) as total_tax,
             IFNULL(SUM(grand_total) / 100.0, 0) as total_amount
      FROM dealer_purchase_records
      WHERE status NOT IN ('cancelled', 'draft')
        AND (? IS NULL OR record_date >= ?)
        AND (? IS NULL OR record_date <= ?)
    `).get(fromDate || null, fromDate || null, toDate || null, toDate || null) as any;

    const totalOutwardTaxable = (salesTotals?.taxable || 0) + (serviceTotals?.taxable || 0);
    const totalOutwardCgst = (salesTotals?.cgst || 0) + (serviceTotals?.cgst || 0);
    const totalOutwardSgst = (salesTotals?.sgst || 0) + (serviceTotals?.sgst || 0);
    const totalOutwardIgst = (salesTotals?.igst || 0) + (serviceTotals?.igst || 0);
    const totalOutwardTax = (salesTotals?.total_tax || 0) + (serviceTotals?.total_tax || 0);

    const netCgst = totalOutwardCgst - (purchaseTotals?.cgst || 0);
    const netSgst = totalOutwardSgst - (purchaseTotals?.sgst || 0);
    const netIgst = totalOutwardIgst - (purchaseTotals?.igst || 0);
    const netTotal = totalOutwardTax - (purchaseTotals?.total_tax || 0);

    // Section 1: Outward Supplies (Output Tax)
    sheet.getRow(6).values = ['1. OUTWARD TAXABLE SUPPLIES (OUTPUT TAX)', '', '', '', '', '', ''];
    sheet.mergeCells('A6:G6');
    sheet.getCell('A6').font = { bold: true, color: { argb: 'FF171717' }, size: 12 };
    sheet.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F2E4' } };

    sheet.getRow(7).values = ['Supply Category', 'Count', 'Taxable Value (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total Tax (₹)'];
    this.styleTableHeader(sheet.getRow(7));

    sheet.getRow(8).values = [
      'Sales Invoices (Gold Jewellery/Bullion)',
      salesTotals?.doc_count || 0,
      salesTotals?.taxable || 0,
      salesTotals?.cgst || 0,
      salesTotals?.sgst || 0,
      salesTotals?.igst || 0,
      salesTotals?.total_tax || 0,
    ];
    sheet.getRow(9).values = [
      'Service Invoices (Making/Repair Charges)',
      serviceTotals?.doc_count || 0,
      serviceTotals?.taxable || 0,
      serviceTotals?.cgst || 0,
      serviceTotals?.sgst || 0,
      serviceTotals?.igst || 0,
      serviceTotals?.total_tax || 0,
    ];
    sheet.getRow(10).values = [
      'TOTAL OUTWARD SUPPLIES',
      (salesTotals?.doc_count || 0) + (serviceTotals?.doc_count || 0),
      totalOutwardTaxable,
      totalOutwardCgst,
      totalOutwardSgst,
      totalOutwardIgst,
      totalOutwardTax,
    ];
    this.styleTotalsRow(sheet.getRow(10));

    // Section 2: Inward Supplies (Input Tax)
    sheet.getRow(12).values = ['2. INWARD TAXABLE SUPPLIES (INPUT TAX CREDIT - DEALER PURCHASES)', '', '', '', '', '', ''];
    sheet.mergeCells('A12:G12');
    sheet.getCell('A12').font = { bold: true, color: { argb: 'FF171717' }, size: 12 };
    sheet.getCell('A12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F2E4' } };

    sheet.getRow(13).values = ['Supply Category', 'Count', 'Taxable Value (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total Tax (₹)'];
    this.styleTableHeader(sheet.getRow(13));

    sheet.getRow(14).values = [
      'Dealer Purchases (Gold Jewellery/Bullion)',
      purchaseTotals?.doc_count || 0,
      purchaseTotals?.taxable || 0,
      purchaseTotals?.cgst || 0,
      purchaseTotals?.sgst || 0,
      purchaseTotals?.igst || 0,
      purchaseTotals?.total_tax || 0,
    ];
    sheet.getRow(15).values = [
      'TOTAL INWARD SUPPLIES',
      purchaseTotals?.doc_count || 0,
      purchaseTotals?.taxable || 0,
      purchaseTotals?.cgst || 0,
      purchaseTotals?.sgst || 0,
      purchaseTotals?.igst || 0,
      purchaseTotals?.total_tax || 0,
    ];
    this.styleTotalsRow(sheet.getRow(15));

    // Section 3: Net Tax Liability
    sheet.getRow(17).values = ['3. ESTIMATED NET TAX POSITION (OUTPUT TAX MINUS INWARD TAX)', '', '', '', '', '', ''];
    sheet.mergeCells('A17:G17');
    sheet.getCell('A17').font = { bold: true, color: { argb: 'FF171717' }, size: 12 };
    sheet.getCell('A17').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F2E4' } };

    sheet.getRow(18).values = ['Tax Head', '', 'Outward Tax (₹)', 'Inward Tax (₹)', 'Net Tax (₹)', 'Status', ''];
    this.styleTableHeader(sheet.getRow(18));

    sheet.getRow(19).values = ['CGST (Central Tax)', '', totalOutwardCgst, purchaseTotals?.cgst || 0, netCgst, netCgst >= 0 ? 'Payable' : 'Credit Carryforward', ''];
    sheet.getRow(20).values = ['SGST (State Tax)', '', totalOutwardSgst, purchaseTotals?.sgst || 0, netSgst, netSgst >= 0 ? 'Payable' : 'Credit Carryforward', ''];
    sheet.getRow(21).values = ['IGST (Integrated Tax)', '', totalOutwardIgst, purchaseTotals?.igst || 0, netIgst, netIgst >= 0 ? 'Payable' : 'Credit Carryforward', ''];
    sheet.getRow(22).values = ['TOTAL NET GST POSITION', '', totalOutwardTax, purchaseTotals?.total_tax || 0, netTotal, netTotal >= 0 ? 'NET PAYABLE' : 'NET CREDIT', ''];
    this.styleTotalsRow(sheet.getRow(22));

    for (const rIdx of [8, 9, 10, 14, 15]) {
      for (const cIdx of [3, 4, 5, 6, 7]) {
        sheet.getRow(rIdx).getCell(cIdx).numFmt = '#,##0.00';
      }
    }
    for (const rIdx of [19, 20, 21, 22]) {
      sheet.getRow(rIdx).getCell(3).numFmt = '#,##0.00';
      sheet.getRow(rIdx).getCell(4).numFmt = '#,##0.00';
      sheet.getRow(rIdx).getCell(5).numFmt = '#,##0.00';
    }

    sheet.getRow(25).values = [
      'IMPORTANT DISCLAIMER: This summary is automatically compiled for chartered accountant preparation and internal review. Actual GST liability and ITC eligibility are subject to GSTR-2B matching and statutory rules.',
    ];
    sheet.mergeCells('A25:G25');
    sheet.getCell('A25').font = { italic: true, size: 9, color: { argb: 'FF777777' } };

    this.autoFitColumns(sheet);
  }

  // ─────────────────────────────────────────────────────────────────
  // SHEET 5: HSN / SAC SUMMARY
  // ─────────────────────────────────────────────────────────────────
  private async buildHsnSacSummarySheet(
    workbook: ExcelJS.Workbook,
    db: any,
    fyName: string,
    fromDate?: string,
    toDate?: string,
    company?: any
  ) {
    const sheet = workbook.addWorksheet('HSN-SAC Summary', {
      views: [{ state: 'frozen', ySplit: 5 }],
    });

    this.addHeaderBlock(sheet, 'HSN / SAC SUMMARY - TARIFF-WISE TAX BREAKDOWN', company, fyName, fromDate, toDate);

    sheet.getRow(5).values = [
      'Type',
      'HSN / SAC Code',
      'Description',
      'Total Qty',
      'Gross Wt (g)',
      'Net Wt (g)',
      'Total Taxable (₹)',
      'CGST (₹)',
      'SGST (₹)',
      'IGST (₹)',
      'Total Tax (₹)',
      'Total Value (₹)',
    ];
    this.styleTableHeader(sheet.getRow(5));

    // Aggregate Sales Items by HSN
    const hsnRows = db.prepare(`
      SELECT 'HSN' as code_type,
             i.hsn_code as code,
             'Gold Jewellery / Bullion' as description,
             SUM(i.quantity) as total_qty,
             SUM(IFNULL(i.gross_weight, 0)) as total_gross_wt,
             SUM(IFNULL(i.net_weight, 0)) as total_net_wt,
             SUM(i.taxable_value / 100.0) as total_taxable,
             SUM(i.cgst_amount / 100.0) as total_cgst,
             SUM(i.sgst_amount / 100.0) as total_sgst,
             SUM(i.igst_amount / 100.0) as total_igst,
             SUM(i.total_value / 100.0) as total_value
      FROM sales_invoice_items i
      JOIN sales_invoices s ON i.invoice_id = s.id
      WHERE s.status NOT IN ('cancelled', 'draft')
        AND (? IS NULL OR s.invoice_date >= ?)
        AND (? IS NULL OR s.invoice_date <= ?)
      GROUP BY i.hsn_code
    `).all(fromDate || null, fromDate || null, toDate || null, toDate || null) as any[];

    // Aggregate Service Items by SAC
    const sacRows = db.prepare(`
      SELECT 'SAC' as code_type,
             i.sac_code as code,
             'Jewellery Making / Repair Services' as description,
             SUM(i.quantity) as total_qty,
             0 as total_gross_wt,
             0 as total_net_wt,
             SUM(i.taxable_value / 100.0) as total_taxable,
             SUM(i.cgst_amount / 100.0) as total_cgst,
             SUM(i.sgst_amount / 100.0) as total_sgst,
             SUM(i.igst_amount / 100.0) as total_igst,
             SUM(i.total_value / 100.0) as total_value
      FROM service_invoice_items i
      JOIN service_invoices sv ON i.invoice_id = sv.id
      WHERE sv.status NOT IN ('cancelled', 'draft')
        AND (? IS NULL OR sv.invoice_date >= ?)
        AND (? IS NULL OR sv.invoice_date <= ?)
      GROUP BY i.sac_code
    `).all(fromDate || null, fromDate || null, toDate || null, toDate || null) as any[];

    const combined = [...hsnRows, ...sacRows];
    let rowIndex = 6;

    for (const r of combined) {
      const row = sheet.getRow(rowIndex);
      const taxTotal = (r.total_cgst || 0) + (r.total_sgst || 0) + (r.total_igst || 0);
      row.values = [
        r.code_type,
        r.code,
        r.description,
        r.total_qty || 0,
        r.total_gross_wt ? Number(r.total_gross_wt) : 0,
        r.total_net_wt ? Number(r.total_net_wt) : 0,
        r.total_taxable ? Number(r.total_taxable) : 0,
        r.total_cgst ? Number(r.total_cgst) : 0,
        r.total_sgst ? Number(r.total_sgst) : 0,
        r.total_igst ? Number(r.total_igst) : 0,
        taxTotal,
        r.total_value ? Number(r.total_value) : 0,
      ];

      row.getCell(5).numFmt = '0.000';
      row.getCell(6).numFmt = '0.000';
      for (const colIdx of [7, 8, 9, 10, 11, 12]) {
        row.getCell(colIdx).numFmt = '#,##0.00';
      }
      rowIndex++;
    }

    if (combined.length > 0) {
      const totRow = sheet.getRow(rowIndex);
      totRow.values = [
        'TOTALS', '', '',
        { formula: `SUM(D6:D${rowIndex - 1})` },
        { formula: `SUM(E6:E${rowIndex - 1})` },
        { formula: `SUM(F6:F${rowIndex - 1})` },
        { formula: `SUM(G6:G${rowIndex - 1})` },
        { formula: `SUM(H6:H${rowIndex - 1})` },
        { formula: `SUM(I6:I${rowIndex - 1})` },
        { formula: `SUM(J6:J${rowIndex - 1})` },
        { formula: `SUM(K6:K${rowIndex - 1})` },
        { formula: `SUM(L6:L${rowIndex - 1})` },
      ];
      this.styleTotalsRow(totRow);
    }

    this.autoFitColumns(sheet);
  }

  // ─────────────────────────────────────────────────────────────────
  // STYLING HELPERS (AGC BRANDING)
  // ─────────────────────────────────────────────────────────────────
  private addHeaderBlock(
    sheet: ExcelJS.Worksheet,
    title: string,
    company: any,
    fyName: string,
    fromDate?: string,
    toDate?: string
  ) {
    sheet.getRow(1).values = [company?.business_name || 'ANJANEYA GOLD COMPANY'];
    sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF171717' } };

    const addrParts = [
      company?.address || '#20, 1ST FLOOR, SARASWATHIPURA MAIN ROAD, OPP. SATHYA SHANTHI GANAPATHI TEMPLE, NANDINI LAYOUT',
      company?.city || 'Bengaluru',
      company?.state || 'Karnataka',
    ].filter(Boolean);
    const gstinVal = company?.gstin && company.gstin !== 'NOT_CONFIGURED' ? company.gstin : '29ACKFA4620Q1ZV';
    const address = `${addrParts.join(', ')} - GSTIN: ${gstinVal}`;
    sheet.getRow(2).values = [address];
    sheet.getCell('A2').font = { size: 10, color: { argb: 'FF555555' } };

    sheet.getRow(3).values = [`${title} • FY ${fyName}`];
    sheet.getCell('A3').font = { bold: true, size: 11, color: { argb: 'FFA98226' } };

    const periodStr = fromDate && toDate ? `Period: ${fromDate} to ${toDate}` : `Financial Year: ${fyName}`;
    sheet.getRow(4).values = [periodStr];
    sheet.getCell('A4').font = { italic: true, size: 9, color: { argb: 'FF666666' } };
  }

  private styleTableHeader(row: ExcelJS.Row) {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF171717' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFC49A35' } },
        bottom: { style: 'medium', color: { argb: 'FFC49A35' } },
        left: { style: 'thin', color: { argb: 'FF333333' } },
        right: { style: 'thin', color: { argb: 'FF333333' } },
      };
    });
    row.height = 26;
  }

  private styleTotalsRow(row: ExcelJS.Row) {
    row.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: 'FF171717' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8F2E4' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFA98226' } },
        bottom: { style: 'double', color: { argb: 'FFA98226' } },
      };
    });
    row.height = 22;
  }

  private autoFitColumns(sheet: ExcelJS.Worksheet) {
    sheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const val = cell.value ? String(cell.value) : '';
        if (val.length > maxLen && val.length < 50) {
          maxLen = val.length;
        }
      });
      col.width = Math.max(maxLen + 3, 12);
    });
  }
}

let excelServiceInstance: ExcelService | null = null;
export function getExcelService(): ExcelService {
  if (!excelServiceInstance) {
    excelServiceInstance = new ExcelService();
  }
  return excelServiceInstance;
}
