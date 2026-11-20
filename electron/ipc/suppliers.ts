import { IpcMain } from 'electron';
import { getDb } from '../database';

export function registerSupplierHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('suppliers:getAll', async () => {
    try {
      const db = getDb();
      const suppliers = db.prepare('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC').all();
      return { success: true, data: suppliers };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('suppliers:getById', async (_event, id: number) => {
    try {
      const db = getDb();
      const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
      if (!supplier) return { success: false, error: 'Supplier not found' };
      return { success: true, data: supplier };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('suppliers:search', async (_event, query: string) => {
    try {
      const db = getDb();
      const searchTerm = `%${query}%`;
      const suppliers = db.prepare(
        `SELECT * FROM suppliers WHERE is_active = 1 AND (
          name LIKE ? OR mobile LIKE ? OR gstin LIKE ? OR reference_number LIKE ? OR city LIKE ?
        ) ORDER BY name ASC LIMIT 50`
      ).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      return { success: true, data: suppliers };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('suppliers:create', async (_event, data: Record<string, any>) => {
    try {
      const db = getDb();

      const duplicates: any[] = [];
      if (data.gstin) {
        const byGstin = db.prepare('SELECT * FROM suppliers WHERE gstin = ? AND is_active = 1').get(data.gstin);
        if (byGstin) duplicates.push({ type: 'GSTIN', record: byGstin });
      }
      if (data.mobile) {
        const byMobile = db.prepare('SELECT * FROM suppliers WHERE mobile = ? AND is_active = 1').get(data.mobile);
        if (byMobile) duplicates.push({ type: 'Mobile', record: byMobile });
      }

      if (duplicates.length > 0 && !data.forceCreate) {
        return { success: false, error: 'duplicate', duplicates };
      }

      const lastSupplier = db.prepare(
        "SELECT reference_number FROM suppliers WHERE reference_number LIKE 'AGC-SUP-%' ORDER BY id DESC LIMIT 1"
      ).get() as any;
      
      let nextNum = 1;
      if (lastSupplier) {
        const lastNum = parseInt(lastSupplier.reference_number.split('-').pop(), 10);
        nextNum = lastNum + 1;
      }
      const referenceNumber = `AGC-SUP-${String(nextNum).padStart(4, '0')}`;

      const result = db.prepare(
        `INSERT INTO suppliers (reference_number, name, mobile, email, address, city, state, state_code, gstin)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        referenceNumber, data.name, data.mobile || null, data.email || null,
        data.address || null, data.city || null, data.state || null,
        data.stateCode || null, data.gstin || null
      );

      const newSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);

      db.prepare('INSERT INTO audit_logs (action, entity_type, entity_id, new_values) VALUES (?, ?, ?, ?)')
        .run('create', 'supplier', result.lastInsertRowid, JSON.stringify(data));

      return { success: true, data: newSupplier };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('suppliers:update', async (_event, id: number, data: Record<string, any>) => {
    try {
      const db = getDb();
      const oldSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
      if (!oldSupplier) return { success: false, error: 'Supplier not found' };

      db.prepare(
        `UPDATE suppliers SET name = ?, mobile = ?, email = ?, address = ?, city = ?, state = ?,
         state_code = ?, gstin = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(
        data.name, data.mobile || null, data.email || null, data.address || null,
        data.city || null, data.state || null, data.stateCode || null,
        data.gstin || null, id
      );

      const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);

      db.prepare('INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values) VALUES (?, ?, ?, ?, ?)')
        .run('update', 'supplier', id, JSON.stringify(oldSupplier), JSON.stringify(data));

      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
