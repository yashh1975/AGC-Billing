import { IpcMain } from 'electron';
import { getDb } from '../database';

export function registerFinancialYearHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('fy:getAll', async () => {
    try {
      const db = getDb();
      const years = db.prepare('SELECT * FROM financial_years ORDER BY start_date DESC').all();
      return { success: true, data: years };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fy:getActive', async () => {
    try {
      const db = getDb();
      const active = db.prepare('SELECT * FROM financial_years WHERE is_active = 1 LIMIT 1').get();
      return { success: true, data: active || null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fy:create', async (_event, data: { name: string; startDate: string; endDate: string; setActive?: boolean }) => {
    try {
      const db = getDb();
      
      // Check for duplicate
      const existing = db.prepare('SELECT id, name FROM financial_years WHERE name = ?').get(data.name) as any;
      if (existing) {
        if (data.setActive) {
          db.prepare('UPDATE financial_years SET is_active = 0').run();
          db.prepare('UPDATE financial_years SET is_active = 1 WHERE id = ?').run(existing.id);
        }
        return { success: true, data: existing };
      }

      // Validate April-March pattern
      const startMonth = new Date(data.startDate).getMonth();
      const endMonth = new Date(data.endDate).getMonth();
      if (startMonth !== 3 || endMonth !== 2) { // JS months: 3=April, 2=March
        return { success: false, error: 'Financial year must run from April to March' };
      }

      const createFY = db.transaction(() => {
        if (data.setActive) {
          db.prepare('UPDATE financial_years SET is_active = 0').run();
        }

        const result = db.prepare(
          'INSERT INTO financial_years (name, start_date, end_date, is_active) VALUES (?, ?, ?, ?)'
        ).run(data.name, data.startDate, data.endDate, data.setActive ? 1 : 0);

        const fyId = result.lastInsertRowid;

        // Create document sequences for this FY
        const settings = db.prepare('SELECT key, value FROM app_settings WHERE key IN (?, ?, ?)').all(
          'sales_prefix', 'purchase_prefix', 'service_prefix'
        ) as Array<{ key: string; value: string }>;

        const prefixMap: Record<string, string> = {};
        settings.forEach(s => { prefixMap[s.key] = s.value; });

        db.prepare(
          'INSERT INTO document_sequences (category, prefix, financial_year_id, format_template) VALUES (?, ?, ?, ?)'
        ).run('sales', prefixMap['sales_prefix'] || 'AGC/S', fyId, '{prefix}/{fy}/{number}');

        db.prepare(
          'INSERT INTO document_sequences (category, prefix, financial_year_id, format_template) VALUES (?, ?, ?, ?)'
        ).run('purchase', prefixMap['purchase_prefix'] || 'AGC/P', fyId, '{prefix}/{fy}/{number}');

        db.prepare(
          'INSERT INTO document_sequences (category, prefix, financial_year_id, format_template) VALUES (?, ?, ?, ?)'
        ).run('service', prefixMap['service_prefix'] || 'AGC/SV', fyId, '{prefix}/{fy}/{number}');

        return fyId;
      });

      const fyId = createFY();
      const fy = db.prepare('SELECT * FROM financial_years WHERE id = ?').get(fyId);
      return { success: true, data: fy };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fy:setActive', async (_event, id: number) => {
    try {
      const db = getDb();
      const switchFY = db.transaction(() => {
        db.prepare('UPDATE financial_years SET is_active = 0').run();
        db.prepare('UPDATE financial_years SET is_active = 1 WHERE id = ?').run(id);
      });
      switchFY();
      const fy = db.prepare('SELECT * FROM financial_years WHERE id = ?').get(id);
      return { success: true, data: fy };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sequences:getNext', async (_event, category: string, fyId: number) => {
    try {
      const db = getDb();
      const getNext = db.transaction(() => {
        const seq = db.prepare(
          'SELECT * FROM document_sequences WHERE category = ? AND financial_year_id = ?'
        ).get(category, fyId) as any;

        if (!seq) {
          throw new Error(`No document sequence found for category=${category}, fyId=${fyId}`);
        }

        const nextNumber = seq.last_number + 1;
        db.prepare(
          "UPDATE document_sequences SET last_number = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(nextNumber, seq.id);

        const fy = db.prepare('SELECT name FROM financial_years WHERE id = ?').get(fyId) as any;
        const paddedNumber = String(nextNumber).padStart(4, '0');
        const documentNumber = `${seq.prefix}/${fy.name}/${paddedNumber}`;

        return { number: nextNumber, documentNumber, prefix: seq.prefix, fyName: fy.name };
      });

      const result = getNext();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
