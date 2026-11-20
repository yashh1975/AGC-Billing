import { IpcMain } from 'electron';
import { getDb } from '../database';

export function registerCustomerHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('customers:getAll', async () => {
    try {
      const db = getDb();
      const customers = db.prepare('SELECT * FROM customers WHERE is_active = 1 ORDER BY name ASC').all();
      return { success: true, data: customers };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('customers:getById', async (_event, id: number) => {
    try {
      const db = getDb();
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }
      return { success: true, data: customer };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('customers:search', async (_event, query: string) => {
    try {
      const db = getDb();
      const searchTerm = `%${query}%`;
      const customers = db.prepare(
        `SELECT * FROM customers WHERE is_active = 1 AND (
          name LIKE ? OR mobile LIKE ? OR gstin LIKE ? OR reference_number LIKE ? OR city LIKE ?
        ) ORDER BY name ASC LIMIT 50`
      ).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      return { success: true, data: customers };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('customers:create', async (_event, data: Record<string, any>) => {
    try {
      const db = getDb();

      // Check for duplicates
      const duplicates: any[] = [];
      if (data.gstin) {
        const byGstin = db.prepare('SELECT * FROM customers WHERE gstin = ? AND is_active = 1').get(data.gstin);
        if (byGstin) duplicates.push({ type: 'GSTIN', record: byGstin });
      }
      if (data.mobile) {
        const byMobile = db.prepare('SELECT * FROM customers WHERE mobile = ? AND is_active = 1').get(data.mobile);
        if (byMobile) duplicates.push({ type: 'Mobile', record: byMobile });
      }

      if (duplicates.length > 0 && !data.forceCreate) {
        return { success: false, error: 'duplicate', duplicates };
      }

      // Generate reference number
      const lastCustomer = db.prepare(
        "SELECT reference_number FROM customers WHERE reference_number LIKE 'AGC-CUS-%' ORDER BY id DESC LIMIT 1"
      ).get() as any;
      
      let nextNum = 1;
      if (lastCustomer) {
        const lastNum = parseInt(lastCustomer.reference_number.split('-').pop(), 10);
        nextNum = lastNum + 1;
      }
      const referenceNumber = `AGC-CUS-${String(nextNum).padStart(4, '0')}`;

      const result = db.prepare(
        `INSERT INTO customers (reference_number, name, mobile, email, address, city, state, state_code, gstin, place_of_supply)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        referenceNumber,
        data.name,
        data.mobile || null,
        data.email || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.stateCode || null,
        data.gstin || null,
        data.placeOfSupply || null
      );

      const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);

      // Audit log
      db.prepare('INSERT INTO audit_logs (action, entity_type, entity_id, new_values) VALUES (?, ?, ?, ?)')
        .run('create', 'customer', result.lastInsertRowid, JSON.stringify(data));

      return { success: true, data: newCustomer };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('customers:update', async (_event, id: number, data: Record<string, any>) => {
    try {
      const db = getDb();
      
      const oldCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
      if (!oldCustomer) {
        return { success: false, error: 'Customer not found' };
      }

      db.prepare(
        `UPDATE customers SET name = ?, mobile = ?, email = ?, address = ?, city = ?, state = ?, 
         state_code = ?, gstin = ?, place_of_supply = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(
        data.name, data.mobile || null, data.email || null, data.address || null,
        data.city || null, data.state || null, data.stateCode || null,
        data.gstin || null, data.placeOfSupply || null, id
      );

      const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);

      db.prepare('INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values) VALUES (?, ?, ?, ?, ?)')
        .run('update', 'customer', id, JSON.stringify(oldCustomer), JSON.stringify(data));

      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
