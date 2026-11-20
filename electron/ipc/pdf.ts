import { IpcMain } from 'electron';
import fs from 'node:fs';
import { getDb } from '../database';
import { savePdfDocument, SavePdfParams } from '../services/pdf-service';

export function registerPdfIpcHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('pdf:saveDocument', async (_event, params: SavePdfParams) => {
    return savePdfDocument(params);
  });

  ipcMain.handle('pdf:generate', async (_event, type: string, id: number) => {
    try {
      const db = getDb();
      let pathVal: string | null = null;
      if (type === 'sales') {
        const row = db.prepare('SELECT pdf_path FROM sales_invoices WHERE id = ?').get(id) as any;
        pathVal = row?.pdf_path;
      } else if (type === 'purchase') {
        const row = db.prepare('SELECT pdf_path FROM dealer_purchase_records WHERE id = ?').get(id) as any;
        pathVal = row?.pdf_path;
      } else if (type === 'service') {
        const row = db.prepare('SELECT pdf_path FROM service_invoices WHERE id = ?').get(id) as any;
        pathVal = row?.pdf_path;
      }
      return { success: true, data: { filePath: pathVal } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('pdf:getPath', async (_event, type: string, id: number) => {
    try {
      const db = getDb();
      let pathVal: string | null = null;
      if (type === 'sales') {
        const row = db.prepare('SELECT pdf_path FROM sales_invoices WHERE id = ?').get(id) as any;
        pathVal = row?.pdf_path;
      } else if (type === 'purchase') {
        const row = db.prepare('SELECT pdf_path FROM dealer_purchase_records WHERE id = ?').get(id) as any;
        pathVal = row?.pdf_path;
      } else if (type === 'service') {
        const row = db.prepare('SELECT pdf_path FROM service_invoices WHERE id = ?').get(id) as any;
        pathVal = row?.pdf_path;
      }
      return { success: true, data: pathVal };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('documents:getAll', async (_event, filters?: { fyName?: string; category?: string }) => {
    try {
      const db = getDb();

      // Query across all three tables
      const salesDocs = db.prepare(`
        SELECT s.id, 'sales' as category, s.invoice_number as document_number,
               s.invoice_date as document_date, s.pdf_path, s.status, s.grand_total,
               c.name as party_name, fy.name as fy_name
        FROM sales_invoices s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN financial_years fy ON s.financial_year_id = fy.id
        WHERE s.pdf_path IS NOT NULL
      `).all() as any[];

      const purchaseDocs = db.prepare(`
        SELECT p.id, 'purchase' as category, p.record_number as document_number,
               p.record_date as document_date, p.pdf_path, p.status, p.grand_total,
               sup.name as party_name, fy.name as fy_name
        FROM dealer_purchase_records p
        LEFT JOIN suppliers sup ON p.supplier_id = sup.id
        LEFT JOIN financial_years fy ON p.financial_year_id = fy.id
        WHERE p.pdf_path IS NOT NULL
      `).all() as any[];

      const serviceDocs = db.prepare(`
        SELECT sv.id, 'service' as category, sv.invoice_number as document_number,
               sv.invoice_date as document_date, sv.pdf_path, sv.status, sv.grand_total,
               c.name as party_name, fy.name as fy_name
        FROM service_invoices sv
        LEFT JOIN customers c ON sv.customer_id = c.id
        LEFT JOIN financial_years fy ON sv.financial_year_id = fy.id
        WHERE sv.pdf_path IS NOT NULL
      `).all() as any[];

      let allDocs = [...salesDocs, ...purchaseDocs, ...serviceDocs];

      // Check file existence on local Windows filesystem
      allDocs = allDocs.map((doc) => {
        const exists = doc.pdf_path ? fs.existsSync(doc.pdf_path) : false;
        let fileSize = 0;
        if (exists) {
          try {
            fileSize = fs.statSync(doc.pdf_path).size;
          } catch {
            fileSize = 0;
          }
        }
        return {
          ...doc,
          fileExists: exists,
          fileSize,
        };
      });

      // Filter
      if (filters?.category) {
        allDocs = allDocs.filter((d) => d.category.toLowerCase() === filters.category!.toLowerCase());
      }
      if (filters?.fyName) {
        allDocs = allDocs.filter((d) => d.fy_name === filters.fyName);
      }

      allDocs.sort((a, b) => b.document_date.localeCompare(a.document_date));

      return { success: true, data: allDocs };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
