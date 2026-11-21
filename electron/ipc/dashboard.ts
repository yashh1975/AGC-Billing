import { IpcMain } from 'electron';
import { getDb } from '../database';

export function registerDashboardHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('dashboard:getSummary', async (_event, fyId?: number) => {
    try {
      const db = getDb();
      
      // Get active FY if not specified
      let activeFyId = fyId;
      if (!activeFyId) {
        const activeFy = db.prepare('SELECT id FROM financial_years WHERE is_active = 1 LIMIT 1').get() as any;
        activeFyId = activeFy?.id;
      }

      if (!activeFyId) {
        return { success: true, data: {
          todaySales: 0, todayPurchases: 0, todayServices: 0,
          monthlySales: 0, monthlyPurchases: 0, monthlyServices: 0,
          totalBills: 0, outstandingAmount: 0, recentTransactions: [],
        }};
      }

      const today = new Date().toISOString().split('T')[0];
      const monthStart = today.substring(0, 7) + '-01';

      // Today's totals
      const todaySales = db.prepare(
        "SELECT COALESCE(SUM(grand_total), 0) as total FROM sales_invoices WHERE invoice_date = ? AND status NOT IN ('cancelled', 'draft') AND financial_year_id = ?"
      ).get(today, activeFyId) as any;

      const todayPurchases = db.prepare(
        "SELECT COALESCE(SUM(grand_total), 0) as total FROM dealer_purchase_records WHERE record_date = ? AND status NOT IN ('cancelled', 'draft') AND financial_year_id = ?"
      ).get(today, activeFyId) as any;

      const todayServices = db.prepare(
        "SELECT COALESCE(SUM(grand_total), 0) as total FROM service_invoices WHERE invoice_date = ? AND status NOT IN ('cancelled', 'draft') AND financial_year_id = ?"
      ).get(today, activeFyId) as any;

      // Monthly totals
      const monthlySales = db.prepare(
        "SELECT COALESCE(SUM(grand_total), 0) as total FROM sales_invoices WHERE invoice_date >= ? AND status NOT IN ('cancelled', 'draft') AND financial_year_id = ?"
      ).get(monthStart, activeFyId) as any;

      const monthlyPurchases = db.prepare(
        "SELECT COALESCE(SUM(grand_total), 0) as total FROM dealer_purchase_records WHERE record_date >= ? AND status NOT IN ('cancelled', 'draft') AND financial_year_id = ?"
      ).get(monthStart, activeFyId) as any;

      const monthlyServices = db.prepare(
        "SELECT COALESCE(SUM(grand_total), 0) as total FROM service_invoices WHERE invoice_date >= ? AND status NOT IN ('cancelled', 'draft') AND financial_year_id = ?"
      ).get(monthStart, activeFyId) as any;

      // Yearly totals (Active Financial Year)
      const yearlySales = db.prepare(
        "SELECT COALESCE(SUM(grand_total), 0) as total FROM sales_invoices WHERE status NOT IN ('cancelled', 'draft') AND financial_year_id = ?"
      ).get(activeFyId) as any;

      const yearlyPurchases = db.prepare(
        "SELECT COALESCE(SUM(grand_total), 0) as total FROM dealer_purchase_records WHERE status NOT IN ('cancelled', 'draft') AND financial_year_id = ?"
      ).get(activeFyId) as any;

      const yearlyServices = db.prepare(
        "SELECT COALESCE(SUM(grand_total), 0) as total FROM service_invoices WHERE status NOT IN ('cancelled', 'draft') AND financial_year_id = ?"
      ).get(activeFyId) as any;

      // Total bill counts
      const salesCount = db.prepare(
        "SELECT COUNT(*) as count FROM sales_invoices WHERE status NOT IN ('cancelled', 'draft') AND financial_year_id = ?"
      ).get(activeFyId) as any;
      const purchaseCount = db.prepare(
        "SELECT COUNT(*) as count FROM dealer_purchase_records WHERE status NOT IN ('cancelled', 'draft') AND financial_year_id = ?"
      ).get(activeFyId) as any;
      const serviceCount = db.prepare(
        "SELECT COUNT(*) as count FROM service_invoices WHERE status NOT IN ('cancelled', 'draft') AND financial_year_id = ?"
      ).get(activeFyId) as any;

      // Outstanding
      const salesOutstanding = db.prepare(
        "SELECT COALESCE(SUM(balance_due), 0) as total FROM sales_invoices WHERE balance_due > 0 AND status = 'finalized' AND financial_year_id = ?"
      ).get(activeFyId) as any;
      const serviceOutstanding = db.prepare(
        "SELECT COALESCE(SUM(balance_due), 0) as total FROM service_invoices WHERE balance_due > 0 AND status = 'finalized' AND financial_year_id = ?"
      ).get(activeFyId) as any;

      // Recent transactions (last 10)
      const recentSales = db.prepare(
        `SELECT 'sales' as type, invoice_number as doc_number, invoice_date as date, 
         grand_total as amount, payment_status, status, customer_id,
         (SELECT name FROM customers WHERE id = customer_id) as party_name
         FROM sales_invoices WHERE financial_year_id = ? AND status NOT IN ('cancelled', 'draft')
         ORDER BY created_at DESC LIMIT 10`
      ).all(activeFyId);

      const recentPurchases = db.prepare(
        `SELECT 'purchase' as type, record_number as doc_number, record_date as date,
         grand_total as amount, payment_status, status, supplier_id as party_id,
         (SELECT name FROM suppliers WHERE id = supplier_id) as party_name
         FROM dealer_purchase_records WHERE financial_year_id = ? AND status NOT IN ('cancelled', 'draft')
         ORDER BY created_at DESC LIMIT 10`
      ).all(activeFyId);

      const recentServices = db.prepare(
        `SELECT 'service' as type, invoice_number as doc_number, invoice_date as date,
         grand_total as amount, payment_status, status, customer_id,
         (SELECT name FROM customers WHERE id = customer_id) as party_name
         FROM service_invoices WHERE financial_year_id = ? AND status NOT IN ('cancelled', 'draft')
         ORDER BY created_at DESC LIMIT 10`
      ).all(activeFyId);

      const allRecent = [...recentSales, ...recentPurchases, ...recentServices]
        .sort((a: any, b: any) => b.date.localeCompare(a.date))
        .slice(0, 10);

      return {
        success: true,
        data: {
          todaySales: todaySales.total,
          todayPurchases: todayPurchases.total,
          todayServices: todayServices.total,
          monthlySales: monthlySales.total,
          monthlyPurchases: monthlyPurchases.total,
          monthlyServices: monthlyServices.total,
          yearlySales: yearlySales.total,
          yearlyPurchases: yearlyPurchases.total,
          yearlyServices: yearlyServices.total,
          totalBills: salesCount.count + purchaseCount.count + serviceCount.count,
          outstandingAmount: salesOutstanding.total + serviceOutstanding.total,
          recentTransactions: allRecent,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
