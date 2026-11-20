import { IpcMain } from 'electron';
import { getDb } from '../database';

export function registerSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('settings:getCompanyProfile', async () => {
    try {
      const db = getDb();
      const profile = db.prepare('SELECT * FROM company_profile LIMIT 1').get();
      return { success: true, data: profile || null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:updateCompanyProfile', async (_event, data: Record<string, any>) => {
    try {
      const db = getDb();
      const existing = db.prepare('SELECT id FROM company_profile LIMIT 1').get() as any;

      if (existing) {
        db.prepare(
          `UPDATE company_profile SET
            business_name = ?, legal_name = ?, gstin = ?, address = ?, city = ?, state = ?,
            state_code = ?, pincode = ?, phone = ?, email = ?, logo_path = ?,
            bank_name = ?, bank_account_name = ?, bank_account_number = ?, bank_ifsc = ?, bank_branch = ?,
            signature_path = ?, invoice_footer = ?, terms_sales = ?, terms_service = ?, terms_purchase = ?,
            updated_at = datetime('now')
          WHERE id = ?`
        ).run(
          data.businessName, data.legalName || null, data.gstin || null,
          data.address || null, data.city || null, data.state || null,
          data.stateCode || null, data.pincode || null, data.phone || null,
          data.email ? String(data.email).trim().toLowerCase() : null, data.logoPath || null,
          data.bankName || null, data.bankAccountName || null,
          data.bankAccountNumber || null, data.bankIfsc || null, data.bankBranch || null,
          data.signaturePath || null, data.invoiceFooter || null,
          data.termsSales || null, data.termsService || null, data.termsPurchase || null,
          existing.id
        );
      } else {
        db.prepare(
          `INSERT INTO company_profile (
            business_name, legal_name, gstin, address, city, state, state_code, pincode,
            phone, email, logo_path, bank_name, bank_account_name, bank_account_number,
            bank_ifsc, bank_branch, signature_path, invoice_footer, terms_sales, terms_service, terms_purchase
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          data.businessName, data.legalName || null, data.gstin || null,
          data.address || null, data.city || null, data.state || null,
          data.stateCode || null, data.pincode || null, data.phone || null,
          data.email ? String(data.email).trim().toLowerCase() : null, data.logoPath || null,
          data.bankName || null, data.bankAccountName || null,
          data.bankAccountNumber || null, data.bankIfsc || null, data.bankBranch || null,
          data.signaturePath || null, data.invoiceFooter || null,
          data.termsSales || null, data.termsService || null, data.termsPurchase || null
        );
      }

      const profile = db.prepare('SELECT * FROM company_profile LIMIT 1').get();
      return { success: true, data: profile };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:get', async (_event, key: string) => {
    try {
      const db = getDb();
      const setting = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any;
      return { success: true, data: setting ? setting.value : null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    try {
      const db = getDb();
      const existing = db.prepare('SELECT id FROM app_settings WHERE key = ?').get(key);
      if (existing) {
        db.prepare("UPDATE app_settings SET value = ?, updated_at = datetime('now') WHERE key = ?").run(value, key);
      } else {
        db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:getAll', async () => {
    try {
      const db = getDb();
      const settings = db.prepare('SELECT * FROM app_settings ORDER BY category, key').all();
      return { success: true, data: settings };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('hsn:getAll', async () => {
    try {
      const db = getDb();
      const codes = db.prepare('SELECT * FROM hsn_master WHERE is_active = 1 ORDER BY code').all();
      return { success: true, data: codes };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sac:getAll', async () => {
    try {
      const db = getDb();
      const codes = db.prepare('SELECT * FROM sac_master WHERE is_active = 1 ORDER BY code').all();
      return { success: true, data: codes };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tax:getAll', async () => {
    try {
      const db = getDb();
      const rates = db.prepare('SELECT * FROM tax_rates WHERE is_active = 1 ORDER BY rate').all();
      return { success: true, data: rates };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tax:create', async (_event, data: Record<string, any>) => {
    try {
      const db = getDb();
      const result = db.prepare(
        'INSERT INTO tax_rates (name, rate, hsn_code, sac_code, category) VALUES (?, ?, ?, ?, ?)'
      ).run(data.name, data.rate, data.hsnCode || null, data.sacCode || null, data.category);
      return { success: true, data: { id: result.lastInsertRowid } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('tax:update', async (_event, id: number, data: Record<string, any>) => {
    try {
      const db = getDb();
      db.prepare(
        'UPDATE tax_rates SET name = ?, rate = ?, hsn_code = ?, sac_code = ?, category = ? WHERE id = ?'
      ).run(data.name, data.rate, data.hsnCode || null, data.sacCode || null, data.category, id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('audit:getAll', async (_event, filters?: { entityType?: string; entityId?: number; limit?: number }) => {
    try {
      const db = getDb();
      let query = `
        SELECT a.*, u.username, u.display_name
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (filters?.entityType) {
        query += ' AND a.entity_type = ?';
        params.push(filters.entityType);
      }
      if (filters?.entityId) {
        query += ' AND a.entity_id = ?';
        params.push(filters.entityId);
      }
      query += ' ORDER BY a.created_at DESC';
      if (filters?.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      } else {
        query += ' LIMIT 100';
      }
      const logs = db.prepare(query).all(...params);
      return { success: true, data: logs };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
