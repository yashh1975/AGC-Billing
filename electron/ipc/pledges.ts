import { IpcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { getDb } from '../database';
import { getFileManager } from '../file-manager';

export interface PledgeInput {
  recordDate: string;
  customerName: string;
  customerAddress?: string;
  phoneNumber?: string;
  principalAmount: number;
  interestRate?: string;
  pledgeDate?: string;
  pledgedName?: string;
  pledgedItemName?: string;
  pledgePlace?: string;
  pledgeAmount: number;
  pledgeInterest?: string;
  status?: string;
  notes?: string;
}

export function registerPledgesHandlers(ipcMain: IpcMain): void {
  // 1. Get All Pledges with Filtering & Summaries
  ipcMain.handle('pledges:getAll', async (_event, filters?: { search?: string; status?: string; fromDate?: string; toDate?: string }) => {
    try {
      const db = getDb();
      let query = 'SELECT * FROM pledge_records WHERE 1=1';
      const params: any[] = [];

      if (filters?.status && filters.status !== 'all') {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters?.fromDate) {
        query += ' AND record_date >= ?';
        params.push(filters.fromDate);
      }

      if (filters?.toDate) {
        query += ' AND record_date <= ?';
        params.push(filters.toDate);
      }

      if (filters?.search && filters.search.trim().length > 0) {
        const term = `%${filters.search.trim().toLowerCase()}%`;
        query += ` AND (
          LOWER(customer_name) LIKE ? OR
          LOWER(IFNULL(phone_number, '')) LIKE ? OR
          LOWER(IFNULL(pledged_name, '')) LIKE ? OR
          LOWER(IFNULL(pledged_item_name, '')) LIKE ? OR
          LOWER(IFNULL(pledge_place, '')) LIKE ? OR
          LOWER(IFNULL(customer_address, '')) LIKE ?
        )`;
        params.push(term, term, term, term, term, term);
      }

      query += ' ORDER BY record_date DESC, id DESC';

      const records = db.prepare(query).all(...params) as any[];

      // Ensure pledge name is always populated (defaults to customer name if self-pledged)
      records.forEach((r) => {
        r.pledged_name = (r.pledged_name && r.pledged_name.trim()) ? r.pledged_name.trim() : r.customer_name;
      });

      // Calculate aggregates
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as totalPledges,
          COUNT(DISTINCT customer_name) as distinctPeople,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activePledges,
          COALESCE(SUM(principal_amount), 0) as totalPrincipal,
          COALESCE(SUM(pledge_amount), 0) as totalPledgeAmount
        FROM pledge_records
      `).get() as any;

      return {
        success: true,
        data: {
          records,
          stats: {
            totalPledges: stats?.totalPledges || 0,
            distinctPeople: stats?.distinctPeople || 0,
            activePledges: stats?.activePledges || 0,
            totalPrincipal: stats?.totalPrincipal || 0,
            totalPledgeAmount: stats?.totalPledgeAmount || 0,
          },
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 2. Get Single Pledge
  ipcMain.handle('pledges:getById', async (_event, id: number) => {
    try {
      const db = getDb();
      const record = db.prepare('SELECT * FROM pledge_records WHERE id = ?').get(id);
      if (!record) {
        return { success: false, error: 'Pledge record not found' };
      }
      return { success: true, data: record };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 3. Create Pledge
  ipcMain.handle('pledges:create', async (_event, input: PledgeInput) => {
    try {
      const db = getDb();
      const stmt = db.prepare(`
        INSERT INTO pledge_records (
          record_date,
          customer_name,
          customer_address,
          phone_number,
          principal_amount,
          interest_rate,
          pledge_date,
          pledged_name,
          pledged_item_name,
          pledge_place,
          pledge_amount,
          pledge_interest,
          status,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const res = stmt.run(
        input.recordDate || new Date().toISOString().slice(0, 10),
        input.customerName.trim(),
        input.customerAddress?.trim() || null,
        input.phoneNumber?.trim() || null,
        Number(input.principalAmount) || 0,
        input.interestRate?.trim() || null,
        input.pledgeDate || null,
        input.pledgedName?.trim() || null,
        input.pledgedItemName?.trim() || null,
        input.pledgePlace?.trim() || null,
        Number(input.pledgeAmount) || 0,
        input.pledgeInterest?.trim() || null,
        input.status || 'active',
        input.notes?.trim() || null
      );

      const created = db.prepare('SELECT * FROM pledge_records WHERE id = ?').get(res.lastInsertRowid);
      return { success: true, data: created };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 4. Update Pledge
  ipcMain.handle('pledges:update', async (_event, id: number, input: Partial<PledgeInput>) => {
    try {
      const db = getDb();
      const existing = db.prepare('SELECT * FROM pledge_records WHERE id = ?').get(id) as any;
      if (!existing) {
        return { success: false, error: 'Pledge record not found' };
      }

      const stmt = db.prepare(`
        UPDATE pledge_records SET
          record_date = ?,
          customer_name = ?,
          customer_address = ?,
          phone_number = ?,
          principal_amount = ?,
          interest_rate = ?,
          pledge_date = ?,
          pledged_name = ?,
          pledged_item_name = ?,
          pledge_place = ?,
          pledge_amount = ?,
          pledge_interest = ?,
          status = ?,
          notes = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `);

      stmt.run(
        input.recordDate ?? existing.record_date,
        (input.customerName ?? existing.customer_name).trim(),
        input.customerAddress !== undefined ? input.customerAddress?.trim() : existing.customer_address,
        input.phoneNumber !== undefined ? input.phoneNumber?.trim() : existing.phone_number,
        input.principalAmount !== undefined ? Number(input.principalAmount) : existing.principal_amount,
        input.interestRate !== undefined ? input.interestRate?.trim() : existing.interest_rate,
        input.pledgeDate !== undefined ? input.pledgeDate : existing.pledge_date,
        input.pledgedName !== undefined ? input.pledgedName?.trim() : existing.pledged_name,
        input.pledgedItemName !== undefined ? input.pledgedItemName?.trim() : existing.pledged_item_name,
        input.pledgePlace !== undefined ? input.pledgePlace?.trim() : existing.pledge_place,
        input.pledgeAmount !== undefined ? Number(input.pledgeAmount) : existing.pledge_amount,
        input.pledgeInterest !== undefined ? input.pledgeInterest?.trim() : existing.pledge_interest,
        input.status ?? existing.status,
        input.notes !== undefined ? input.notes?.trim() : existing.notes,
        id
      );

      const updated = db.prepare('SELECT * FROM pledge_records WHERE id = ?').get(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 5. Delete Pledge
  ipcMain.handle('pledges:delete', async (_event, id: number) => {
    try {
      const db = getDb();
      const res = db.prepare('DELETE FROM pledge_records WHERE id = ?').run(id);
      if (res.changes === 0) {
        return { success: false, error: 'Record not found or already deleted' };
      }
      return { success: true, data: { id } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 6. Export Pledges to Excel
  ipcMain.handle('pledges:exportExcel', async () => {
    try {
      const db = getDb();
      const fileMgr = getFileManager();

      const company = (db.prepare('SELECT * FROM company_profile ORDER BY id DESC LIMIT 1').get() as any) || {
        business_name: 'ANJANEYA GOLD COMPANY',
        gstin: '29ACKFA4620Q1ZV',
        phone: '9008477669',
      };

      const records = db.prepare('SELECT * FROM pledge_records ORDER BY record_date DESC, id DESC').all() as any[];

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'AGC Billing & Management System';
      workbook.lastModifiedBy = company.business_name;
      workbook.created = new Date();
      workbook.modified = new Date();

      const sheet = workbook.addWorksheet('Pledge Details Registry', {
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
        views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
      });

      // Helper to ensure percentage symbol is always present for interest rates
      const formatPct = (val?: string | null): string => {
        if (!val || !val.trim()) return '';
        const t = val.trim();
        return t.includes('%') ? t : `${t}%`;
      };

      // Title & Subtitle (15 columns A to O)
      sheet.mergeCells('A1:O1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = `${(company.business_name || 'ANJANEYA GOLD COMPANY').toUpperCase()} — PLEDGE DETAILS REGISTRY`;
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF171717' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 32;

      sheet.mergeCells('A2:O2');
      const subCell = sheet.getCell('A2');
      subCell.value = `Exported on: ${new Date().toLocaleString('en-IN')} | Total Records: ${records.length}`;
      subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F2E4' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(2).height = 20;

      // Blank Row 3
      sheet.getRow(3).height = 8;

      // Table Headers (Row 4)
      const headers = [
        'Sl No',
        'Record Date',
        'Customer Name',
        'Pledge Name',
        'Phone Number',
        'Address',
        'Principal Amt (₹)',
        'Customer Interest (%)',
        'Pledge Date',
        'Pledged Item Name',
        'Pledge Place / Bank',
        'Pledge Amount (₹)',
        'Pledge Interest (%)',
        'Status',
        'Notes',
      ];

      const headerRow = sheet.getRow(4);
      headerRow.values = headers;
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC49A35' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF171717' } },
          bottom: { style: 'medium', color: { argb: 'FF171717' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      });

      // Data Rows
      let currentRow = 5;
      let sumPrincipal = 0;
      let sumPledgeAmt = 0;

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const row = sheet.getRow(currentRow);
        const pAmt = Number(r.principal_amount) || 0;
        const plAmt = Number(r.pledge_amount) || 0;
        const plName = (r.pledged_name && r.pledged_name.trim()) ? r.pledged_name.trim() : (r.customer_name || '');
        sumPrincipal += pAmt;
        sumPledgeAmt += plAmt;

        row.values = [
          i + 1,
          r.record_date || '',
          r.customer_name || '',
          plName,
          r.phone_number || '',
          r.customer_address || '',
          pAmt,
          formatPct(r.interest_rate),
          r.pledge_date || '',
          r.pledged_item_name || '',
          r.pledge_place || '',
          plAmt,
          formatPct(r.pledge_interest),
          (r.status || 'active').toUpperCase(),
          r.notes || '',
        ];

        row.height = 22;
        const isEven = i % 2 === 0;

        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 9 };
          if (!isEven) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDFBF7' } };
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          };

          // Alignment & number formatting
          if (colNumber === 1 || colNumber === 2 || colNumber === 9 || colNumber === 14) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 8 || colNumber === 13) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 7 || colNumber === 12) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0.00';
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }

          if (colNumber === 14) {
            cell.font = {
              name: 'Arial',
              size: 9,
              bold: true,
              color: { argb: r.status === 'released' ? 'FF15803D' : (r.status === 'closed' ? 'FF6B7280' : 'FFB45309') },
            };
          }
        });

        currentRow++;
      }

      // Total Row
      const totalRow = sheet.getRow(currentRow);
      totalRow.values = [
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        sumPrincipal,
        '',
        '',
        '',
        '',
        sumPledgeAmt,
        '',
        '',
        '',
      ];
      totalRow.height = 24;
      totalRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF171717' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F2E4' } };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF171717' } },
          bottom: { style: 'double', color: { argb: 'FF171717' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
        if (colNumber === 7 || colNumber === 12) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00';
        } else if (colNumber === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });

      // Set explicit column widths
      sheet.columns = [
        { width: 8 },  // Sl No (1)
        { width: 14 }, // Record Date (2)
        { width: 22 }, // Customer Name (3)
        { width: 20 }, // Pledged Name (4)
        { width: 16 }, // Phone (5)
        { width: 26 }, // Address (6)
        { width: 18 }, // Principal Amt (7)
        { width: 18 }, // Customer Interest (%) (8)
        { width: 14 }, // Pledge Date (9)
        { width: 24 }, // Pledged Item Name (10)
        { width: 22 }, // Pledge Place (11)
        { width: 18 }, // Pledge Amt (12)
        { width: 18 }, // Pledge Interest (%) (13)
        { width: 14 }, // Status (14)
        { width: 24 }, // Notes (15)
      ];

      // Save file in AGC_Data/Pledge_Reports/
      const rootDir = fileMgr.getDataDirectory();
      const pledgeDir = path.join(rootDir, 'Pledge_Reports');
      if (!fs.existsSync(pledgeDir)) {
        fs.mkdirSync(pledgeDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `AGC_Pledge_Registry_${timestamp}.xlsx`;
      const filePath = path.join(pledgeDir, fileName);

      await workbook.xlsx.writeFile(filePath);

      // Open file in default spreadsheet application (Excel)
      await shell.openPath(filePath);

      return {
        success: true,
        data: {
          filePath,
          fileName,
          totalRecords: records.length,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 7. Open Pledge Reports Folder in File Explorer
  ipcMain.handle('pledges:openFolder', async () => {
    try {
      const fileMgr = getFileManager();
      const rootDir = fileMgr.getDataDirectory();
      const pledgeDir = path.join(rootDir, 'Pledge_Reports');
      if (!fs.existsSync(pledgeDir)) {
        fs.mkdirSync(pledgeDir, { recursive: true });
      }
      await shell.openPath(pledgeDir);
      return { success: true, data: { folderPath: pledgeDir } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
