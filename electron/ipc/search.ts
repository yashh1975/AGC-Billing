import { IpcMain } from 'electron';
import { getDb } from '../database';

export interface GlobalSearchResult {
  category: 'sales' | 'purchase' | 'service' | 'customer' | 'supplier';
  id: number;
  title: string;
  subtitle: string;
  date?: string;
  amount?: number;
  status?: string;
  referenceNumber: string;
}

export function performGlobalSearch(db: any, query: string): GlobalSearchResult[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const q = `%${query.trim().toLowerCase()}%`;
  const results: GlobalSearchResult[] = [];

  // 1. Sales Invoices (exclude drafts)
  const sales = db.prepare(`
    SELECT s.id, s.invoice_number, s.invoice_date, (s.grand_total / 100.0) as final_amount, s.status, s.payment_status,
           c.name as customer_name, c.mobile as customer_mobile
    FROM sales_invoices s
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.status != 'draft'
      AND (LOWER(s.invoice_number) LIKE ?
       OR LOWER(c.name) LIKE ?
       OR LOWER(IFNULL(c.mobile, '')) LIKE ?
       OR LOWER(IFNULL(c.gstin, '')) LIKE ?)
    ORDER BY s.invoice_date DESC
    LIMIT 10
  `).all(q, q, q, q) as any[];

  for (const row of sales) {
    results.push({
      category: 'sales',
      id: row.id,
      title: `Sales Invoice: ${row.invoice_number}`,
      subtitle: `${row.customer_name || 'Customer'} • ₹${(row.final_amount || 0).toLocaleString('en-IN')}`,
      date: row.invoice_date,
      amount: row.final_amount,
      status: row.status,
      referenceNumber: row.invoice_number,
    });
  }

  // 2. Dealer Purchases (exclude drafts)
  const purchases = db.prepare(`
    SELECT p.id, p.record_number, p.original_invoice_number, p.original_invoice_date, p.record_date,
           (p.grand_total / 100.0) as total_amount, p.status, p.payment_status,
           s.name as supplier_name, s.mobile as supplier_mobile
    FROM dealer_purchase_records p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.status != 'draft'
      AND (LOWER(p.record_number) LIKE ?
       OR LOWER(IFNULL(p.original_invoice_number, '')) LIKE ?
       OR LOWER(s.name) LIKE ?
       OR LOWER(IFNULL(s.mobile, '')) LIKE ?
       OR LOWER(IFNULL(s.gstin, '')) LIKE ?)
    ORDER BY p.record_date DESC
    LIMIT 10
  `).all(q, q, q, q, q) as any[];

  for (const row of purchases) {
    results.push({
      category: 'purchase',
      id: row.id,
      title: `Dealer Purchase: ${row.record_number}`,
      subtitle: `Original Bill: ${row.original_invoice_number || 'N/A'} • ${row.supplier_name} • ₹${(row.total_amount || 0).toLocaleString('en-IN')}`,
      date: row.record_date,
      amount: row.total_amount,
      status: row.status,
      referenceNumber: row.record_number,
    });
  }

  // 3. Service Invoices (exclude drafts)
  const services = db.prepare(`
    SELECT sv.id, sv.invoice_number, sv.invoice_date, (sv.grand_total / 100.0) as final_amount, sv.status, sv.payment_status,
           c.name as customer_name, c.mobile as customer_mobile
    FROM service_invoices sv
    LEFT JOIN customers c ON sv.customer_id = c.id
    WHERE sv.status != 'draft'
      AND (LOWER(sv.invoice_number) LIKE ?
       OR LOWER(c.name) LIKE ?
       OR LOWER(IFNULL(c.mobile, '')) LIKE ?
       OR LOWER(IFNULL(c.gstin, '')) LIKE ?)
    ORDER BY sv.invoice_date DESC
    LIMIT 10
  `).all(q, q, q, q) as any[];

  for (const row of services) {
    results.push({
      category: 'service',
      id: row.id,
      title: `Service Invoice: ${row.invoice_number}`,
      subtitle: `${row.customer_name || 'Customer'} • ₹${(row.final_amount || 0).toLocaleString('en-IN')}`,
      date: row.invoice_date,
      amount: row.final_amount,
      status: row.status,
      referenceNumber: row.invoice_number,
    });
  }

  // 4. Customers
  const customers = db.prepare(`
    SELECT id, reference_number, name, mobile, gstin, city, total_bills, (total_amount / 100.0) as total_amount
    FROM customers
    WHERE LOWER(reference_number) LIKE ?
       OR LOWER(name) LIKE ?
       OR LOWER(IFNULL(mobile, '')) LIKE ?
       OR LOWER(IFNULL(gstin, '')) LIKE ?
    ORDER BY id DESC
    LIMIT 10
  `).all(q, q, q, q) as any[];

  for (const row of customers) {
    results.push({
      category: 'customer',
      id: row.id,
      title: `Customer: ${row.name}`,
      subtitle: `${row.reference_number} • Mobile: ${row.mobile || 'N/A'} • ${row.total_bills} bills`,
      amount: row.total_amount,
      referenceNumber: row.reference_number,
    });
  }

  // 5. Suppliers
  const suppliers = db.prepare(`
    SELECT id, reference_number, name, mobile, gstin, city, total_bills, (total_amount / 100.0) as total_amount
    FROM suppliers
    WHERE LOWER(reference_number) LIKE ?
       OR LOWER(name) LIKE ?
       OR LOWER(IFNULL(mobile, '')) LIKE ?
       OR LOWER(IFNULL(gstin, '')) LIKE ?
    ORDER BY id DESC
    LIMIT 10
  `).all(q, q, q, q) as any[];

  for (const row of suppliers) {
    results.push({
      category: 'supplier',
      id: row.id,
      title: `Supplier: ${row.name}`,
      subtitle: `${row.reference_number} • GSTIN: ${row.gstin || 'N/A'} • ${row.total_bills} bills`,
      amount: row.total_amount,
      referenceNumber: row.reference_number,
    });
  }

  return results;
}

export function registerSearchHandlers(ipcMain: IpcMain): void {
  /**
   * Global quick search for Ctrl+K command palette
   */
  ipcMain.handle('search:global', async (_event, query: string) => {
    try {
      const db = getDb();
      const results = performGlobalSearch(db, query);
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Unified Master Bills query for /all-bills
   */
  ipcMain.handle('billing:getAllBills', async (_event, filters?: {
    category?: 'all' | 'sales' | 'purchase' | 'service';
    fyId?: number;
    status?: string;
    paymentStatus?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
  }) => {
    try {
      const db = getDb();
      const allBills: any[] = [];
      const cat = filters?.category || 'all';

      // 1. Sales Invoices
      if (cat === 'all' || cat === 'sales') {
        let q = `
          SELECT s.id, 'sales' as bill_type, s.invoice_number as document_number, s.invoice_date as document_date,
                 s.financial_year_id, s.status, s.payment_status,
                 (s.taxable_amount / 100.0) as taxable_value,
                 (s.cgst_amount / 100.0) as cgst_amount,
                 (s.sgst_amount / 100.0) as sgst_amount,
                 (s.igst_amount / 100.0) as igst_amount,
                 ((s.cgst_amount + s.sgst_amount + s.igst_amount) / 100.0) as total_tax,
                 (s.grand_total / 100.0) as total_amount,
                 (s.amount_received / 100.0) as amount_paid,
                 (s.balance_due / 100.0) as balance_due,
                 s.customer_id as party_id, c.name as party_name, c.mobile as party_mobile,
                 c.gstin as party_gstin, c.reference_number as party_reference,
                 NULL as original_invoice_number, NULL as original_invoice_date
          FROM sales_invoices s
          LEFT JOIN customers c ON s.customer_id = c.id
          WHERE 1=1
        `;
        const params: any[] = [];
        if (filters?.fyId) { q += ' AND s.financial_year_id = ?'; params.push(filters.fyId); }
        if (filters?.status && filters.status !== 'all') {
          q += ' AND s.status = ?';
          params.push(filters.status);
        } else {
          q += " AND s.status != 'draft'";
        }
        if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
          if (filters.paymentStatus === 'due') {
            q += ' AND s.balance_due > 0';
          } else {
            q += ' AND s.payment_status = ?';
            params.push(filters.paymentStatus);
          }
        }
        if (filters?.fromDate) { q += ' AND s.invoice_date >= ?'; params.push(filters.fromDate); }
        if (filters?.toDate) { q += ' AND s.invoice_date <= ?'; params.push(filters.toDate); }
        if (filters?.search && filters.search.trim()) {
          const sTerm = `%${filters.search.trim().toLowerCase()}%`;
          q += ' AND (LOWER(s.invoice_number) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(IFNULL(c.mobile, "")) LIKE ? OR LOWER(IFNULL(c.gstin, "")) LIKE ?)';
          params.push(sTerm, sTerm, sTerm, sTerm);
        }
        const sales = db.prepare(q).all(...params);
        allBills.push(...sales);
      }

      // 2. Dealer Purchases
      if (cat === 'all' || cat === 'purchase') {
        let q = `
          SELECT p.id, 'purchase' as bill_type, p.record_number as document_number, p.record_date as document_date,
                 p.financial_year_id, p.status, p.payment_status,
                 (p.taxable_amount / 100.0) as taxable_value,
                 (p.cgst_amount / 100.0) as cgst_amount,
                 (p.sgst_amount / 100.0) as sgst_amount,
                 (p.igst_amount / 100.0) as igst_amount,
                 ((p.cgst_amount + p.sgst_amount + p.igst_amount) / 100.0) as total_tax,
                 (p.grand_total / 100.0) as total_amount,
                 (p.amount_paid / 100.0) as amount_paid,
                 (p.balance_due / 100.0) as balance_due,
                 p.supplier_id as party_id, s.name as party_name, s.mobile as party_mobile,
                 s.gstin as party_gstin, s.reference_number as party_reference,
                 p.original_invoice_number, p.original_invoice_date
          FROM dealer_purchase_records p
          LEFT JOIN suppliers s ON p.supplier_id = s.id
          WHERE 1=1
        `;
        const params: any[] = [];
        if (filters?.fyId) { q += ' AND p.financial_year_id = ?'; params.push(filters.fyId); }
        if (filters?.status && filters.status !== 'all') {
          q += ' AND p.status = ?';
          params.push(filters.status);
        } else {
          q += " AND p.status != 'draft'";
        }
        if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
          if (filters.paymentStatus === 'due') {
            q += ' AND p.balance_due > 0';
          } else {
            q += ' AND p.payment_status = ?';
            params.push(filters.paymentStatus);
          }
        }
        if (filters?.fromDate) { q += ' AND p.record_date >= ?'; params.push(filters.fromDate); }
        if (filters?.toDate) { q += ' AND p.record_date <= ?'; params.push(filters.toDate); }
        if (filters?.search && filters.search.trim()) {
          const sTerm = `%${filters.search.trim().toLowerCase()}%`;
          q += ' AND (LOWER(p.record_number) LIKE ? OR LOWER(IFNULL(p.original_invoice_number, "")) LIKE ? OR LOWER(s.name) LIKE ? OR LOWER(IFNULL(s.mobile, "")) LIKE ? OR LOWER(IFNULL(s.gstin, "")) LIKE ?)';
          params.push(sTerm, sTerm, sTerm, sTerm, sTerm);
        }
        const purchases = db.prepare(q).all(...params);
        allBills.push(...purchases);
      }

      // 3. Service Invoices
      if (cat === 'all' || cat === 'service') {
        let q = `
          SELECT sv.id, 'service' as bill_type, sv.invoice_number as document_number, sv.invoice_date as document_date,
                 sv.financial_year_id, sv.status, sv.payment_status,
                 (sv.taxable_amount / 100.0) as taxable_value,
                 (sv.cgst_amount / 100.0) as cgst_amount,
                 (sv.sgst_amount / 100.0) as sgst_amount,
                 (sv.igst_amount / 100.0) as igst_amount,
                 ((sv.cgst_amount + sv.sgst_amount + sv.igst_amount) / 100.0) as total_tax,
                 (sv.grand_total / 100.0) as total_amount,
                 (sv.amount_received / 100.0) as amount_paid,
                 (sv.balance_due / 100.0) as balance_due,
                 sv.customer_id as party_id, c.name as party_name, c.mobile as party_mobile,
                 c.gstin as party_gstin, c.reference_number as party_reference,
                 NULL as original_invoice_number, NULL as original_invoice_date
          FROM service_invoices sv
          LEFT JOIN customers c ON sv.customer_id = c.id
          WHERE 1=1
        `;
        const params: any[] = [];
        if (filters?.fyId) { q += ' AND sv.financial_year_id = ?'; params.push(filters.fyId); }
        if (filters?.status && filters.status !== 'all') {
          q += ' AND sv.status = ?';
          params.push(filters.status);
        } else {
          q += " AND sv.status != 'draft'";
        }
        if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
          if (filters.paymentStatus === 'due') {
            q += ' AND sv.balance_due > 0';
          } else {
            q += ' AND sv.payment_status = ?';
            params.push(filters.paymentStatus);
          }
        }
        if (filters?.fromDate) { q += ' AND sv.invoice_date >= ?'; params.push(filters.fromDate); }
        if (filters?.toDate) { q += ' AND sv.invoice_date <= ?'; params.push(filters.toDate); }
        if (filters?.search && filters.search.trim()) {
          const sTerm = `%${filters.search.trim().toLowerCase()}%`;
          q += ' AND (LOWER(sv.invoice_number) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(IFNULL(c.mobile, "")) LIKE ? OR LOWER(IFNULL(c.gstin, "")) LIKE ?)';
          params.push(sTerm, sTerm, sTerm, sTerm);
        }
        const services = db.prepare(q).all(...params);
        allBills.push(...services);
      }

      // Sort combined array by document_date DESC, id DESC
      allBills.sort((a, b) => {
        const dateCompare = (b.document_date || '').localeCompare(a.document_date || '');
        if (dateCompare !== 0) return dateCompare;
        return b.id - a.id;
      });

      return { success: true, data: allBills };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
