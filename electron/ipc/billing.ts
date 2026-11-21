import { IpcMain } from 'electron';
import { getDb } from '../database';

export function registerBillingIpcHandlers(ipcMain: IpcMain): void {
  // Helper to generate clean, sequential estimate numbers: EST-0001, EST-0002...
  function getNextEstimateNumber(db: any): string {
    try {
      const rows = db.prepare(`
        SELECT invoice_number as num FROM sales_invoices WHERE invoice_number LIKE 'EST-%'
        UNION ALL
        SELECT invoice_number as num FROM service_invoices WHERE invoice_number LIKE 'EST-%'
        UNION ALL
        SELECT record_number as num FROM dealer_purchase_records WHERE record_number LIKE 'EST-%'
      `).all() as { num: string }[];

      let maxSeq = 0;
      for (const r of rows) {
        if (!r.num) continue;
        const match = r.num.match(/^EST-(\d+)$/i);
        if (match) {
          const val = parseInt(match[1], 10);
          if (val > maxSeq && val < 100000) maxSeq = val;
        }
      }
      const nextSeq = maxSeq + 1;
      return `EST-${String(nextSeq).padStart(4, '0')}`;
    } catch {
      return 'EST-0001';
    }
  }
  // ─────────────────────────────────────────────────────────────────
  // SALES INVOICES
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle('sales:getAll', async (_event, filters?: { customerId?: number; fyId?: number; status?: string }) => {
    try {
      const db = getDb();
      let query = `
        SELECT s.*, c.name as customer_name, c.mobile as customer_mobile, c.reference_number as customer_reference
        FROM sales_invoices s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.customerId) {
        query += ' AND s.customer_id = ?';
        params.push(filters.customerId);
      }
      if (filters?.fyId) {
        query += ' AND s.financial_year_id = ?';
        params.push(filters.fyId);
      }
      if (filters?.status) {
        query += ' AND s.status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY s.invoice_date DESC, s.id DESC';
      const invoices = db.prepare(query).all(...params);
      return { success: true, data: invoices };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sales:getById', async (_event, id: number) => {
    try {
      const db = getDb();
      const invoice = db.prepare(`
        SELECT s.*, c.name as customer_name, c.mobile as customer_mobile, c.address as customer_address, 
               c.gstin as customer_gstin, c.city as customer_city, c.state as customer_state,
               c.state_code as customer_state_code, c.reference_number as customer_reference
        FROM sales_invoices s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.id = ?
      `).get(id) as any;

      if (!invoice) return { success: false, error: 'Sales invoice not found' };

      const items = db.prepare(
        'SELECT * FROM sales_invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, id ASC'
      ).all(id);

      const payments = db.prepare(
        "SELECT * FROM payments WHERE document_type = 'sales' AND document_id = ? ORDER BY payment_date DESC, id DESC"
      ).all(id);

      return { success: true, data: { ...invoice, items, payments } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sales:create', async (_event, data: any) => {
    try {
      const db = getDb();

      const saveTransaction = db.transaction(() => {
        let customerId = data.customerId;

        // Auto-register customer if customerId is not provided or customer details are new
        if (!customerId && data.customer) {
          // Check if customer exists by GSTIN or mobile
          let existingCustomer: any = null;
          if (data.customer.gstin) {
            existingCustomer = db.prepare('SELECT id FROM customers WHERE gstin = ? AND is_active = 1').get(data.customer.gstin);
          }
          if (!existingCustomer && data.customer.mobile) {
            existingCustomer = db.prepare('SELECT id FROM customers WHERE mobile = ? AND is_active = 1').get(data.customer.mobile);
          }

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            // Generate customer reference AGC-CUS-XXXX
            const lastCus = db.prepare(
              "SELECT reference_number FROM customers WHERE reference_number LIKE 'AGC-CUS-%' ORDER BY id DESC LIMIT 1"
            ).get() as any;
            let nextNum = 1;
            if (lastCus) {
              const lastNum = parseInt(lastCus.reference_number.split('-').pop(), 10);
              if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
            const refNumber = `AGC-CUS-${String(nextNum).padStart(4, '0')}`;

            const insertCus = db.prepare(`
              INSERT INTO customers (reference_number, name, mobile, address, city, state, state_code, gstin, place_of_supply, first_transaction_date, last_transaction_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              refNumber,
              data.customer.name,
              data.customer.mobile || null,
              data.customer.address || null,
              data.customer.city || null,
              data.customer.state || null,
              data.customer.stateCode || null,
              data.customer.gstin || null,
              data.placeOfSupply || 'Karnataka',
              data.invoiceDate,
              data.invoiceDate
            );
            customerId = insertCus.lastInsertRowid;
          }
        }

        // Determine Invoice Number
        let invoiceNumber = data.invoiceNumber;
        const isFinal = data.status === 'finalized';

        if (isFinal) {
          if (!invoiceNumber || invoiceNumber.startsWith('DRAFT-') || invoiceNumber.startsWith('EST-')) {
            // Allocate real statutory sequence number
            const seq = db.prepare(
              "SELECT * FROM document_sequences WHERE category = 'sales' AND financial_year_id = ?"
            ).get(data.financialYearId) as any;

            if (seq) {
              const nextSeqNum = seq.last_number + 1;
              db.prepare("UPDATE document_sequences SET last_number = ?, updated_at = datetime('now') WHERE id = ?")
                .run(nextSeqNum, seq.id);

              const fy = db.prepare('SELECT name FROM financial_years WHERE id = ?').get(data.financialYearId) as any;
              const padded = String(nextSeqNum).padStart(4, '0');
              invoiceNumber = `${seq.prefix}/${fy?.name || '26-27'}/${padded}`;
            } else {
              invoiceNumber = `AGC/S/26-27/${Date.now().toString().slice(-4)}`;
            }
          }
        } else {
          // Draft / Estimate mode: NEVER consume statutory sequence counter
          if (!invoiceNumber || invoiceNumber === 'EST-DRAFT' || (!invoiceNumber.startsWith('DRAFT-') && !invoiceNumber.startsWith('EST-'))) {
            invoiceNumber = getNextEstimateNumber(db);
          }
        }

        // Payment status calculation
        let paymentStatus = 'unpaid';
        if (data.amountReceived >= data.grandTotal && data.grandTotal > 0) {
          paymentStatus = 'paid';
        } else if (data.amountReceived > 0) {
          paymentStatus = 'partial';
        }

        // Insert Invoice Record
        const insertInvoice = db.prepare(`
          INSERT INTO sales_invoices (
            invoice_number, financial_year_id, customer_id, invoice_date, place_of_supply, supply_type,
            subtotal, total_discount, total_making_charges, total_other_charges, taxable_amount,
            cgst_amount, sgst_amount, igst_amount, round_off, grand_total, amount_received, balance_due,
            payment_status, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          invoiceNumber,
          data.financialYearId,
          customerId || null,
          data.invoiceDate,
          data.placeOfSupply || 'Karnataka',
          data.supplyType || 'intra',
          data.subtotal || 0,
          data.totalDiscount || 0,
          data.totalMakingCharges || 0,
          data.totalOtherCharges || 0,
          data.taxableAmount || 0,
          data.cgstAmount || 0,
          data.sgstAmount || 0,
          data.igstAmount || 0,
          data.roundOff || 0,
          data.grandTotal || 0,
          data.amountReceived || 0,
          data.balanceDue || 0,
          paymentStatus,
          data.status || 'draft',
          data.notes || null
        );

        const invoiceId = insertInvoice.lastInsertRowid;

        // Insert Line Items
        if (Array.isArray(data.items) && data.items.length > 0) {
          const insertItem = db.prepare(`
            INSERT INTO sales_invoice_items (
              invoice_id, description, category, hsn_code, quantity, gross_weight, net_weight,
              rate, making_charges, other_charges, discount, taxable_value, gst_rate,
              cgst_amount, sgst_amount, igst_amount, total_value, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          data.items.forEach((item: any, idx: number) => {
            insertItem.run(
              invoiceId,
              item.description,
              item.category || 'Jewellery',
              item.hsnCode || '7113',
              item.quantity || 1,
              item.grossWeight || null,
              item.netWeight || null,
              item.ratePaise || 0,
              item.makingChargesPaise || 0,
              item.otherChargesPaise || 0,
              item.discountPaise || 0,
              item.taxableValuePaise || 0,
              item.gstRate || 3,
              item.cgstAmountPaise || 0,
              item.sgstAmountPaise || 0,
              item.igstAmountPaise || 0,
              item.totalValuePaise || 0,
              idx
            );
          });
        }

        // Insert initial payment if amount received > 0
        if (data.amountReceived > 0) {
          db.prepare(`
            INSERT INTO payments (document_type, document_id, payment_date, payment_mode, amount, reference_number, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            'sales',
            invoiceId,
            data.invoiceDate,
            data.paymentMode || 'cash',
            data.amountReceived,
            data.paymentReference || null,
            'Initial payment recorded during billing'
          );
        }

        // Update customer total metrics if finalized
        if (customerId && isFinal) {
          db.prepare(`
            UPDATE customers SET
              total_bills = total_bills + 1,
              total_amount = total_amount + ?,
              last_transaction_date = ?,
              updated_at = datetime('now')
            WHERE id = ?
          `).run(data.grandTotal || 0, data.invoiceDate, customerId);
        }

        return invoiceId;
      });

      const invoiceId = saveTransaction();
      const saved = db.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(invoiceId);
      return { success: true, data: saved };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sales:finalize', async (_event, id: number) => {
    try {
      const db = getDb();
      const invoice = db.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(id) as any;
      if (!invoice) return { success: false, error: 'Invoice not found' };
      if (invoice.status === 'finalized') return { success: true, data: invoice };

      const finalizeTransaction = db.transaction(() => {
        let finalNumber = invoice.invoice_number;

        // If currently a temporary draft number, allocate permanent number
        if (finalNumber.startsWith('DRAFT-') || finalNumber.includes('TMP')) {
          const seq = db.prepare(
            "SELECT * FROM document_sequences WHERE category = 'sales' AND financial_year_id = ?"
          ).get(invoice.financial_year_id) as any;

          if (seq) {
            const nextSeqNum = seq.last_number + 1;
            db.prepare("UPDATE document_sequences SET last_number = ?, updated_at = datetime('now') WHERE id = ?")
              .run(nextSeqNum, seq.id);

            const fy = db.prepare('SELECT name FROM financial_years WHERE id = ?').get(invoice.financial_year_id) as any;
            finalNumber = `${seq.prefix}/${fy?.name || '26-27'}/${String(nextSeqNum).padStart(4, '0')}`;
          }
        }

        db.prepare(`
          UPDATE sales_invoices SET
            invoice_number = ?,
            status = 'finalized',
            updated_at = datetime('now')
          WHERE id = ?
        `).run(finalNumber, id);

        // Update customer total business
        if (invoice.customer_id) {
          db.prepare(`
            UPDATE customers SET
              total_bills = total_bills + 1,
              total_amount = total_amount + ?,
              last_transaction_date = ?,
              updated_at = datetime('now')
            WHERE id = ?
          `).run(invoice.grand_total, invoice.invoice_date, invoice.customer_id);
        }

        return finalNumber;
      });

      finalizeTransaction();
      const updated = db.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sales:cancel', async (_event, id: number, reason: string) => {
    try {
      const db = getDb();
      const invoice = db.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(id) as any;
      if (!invoice) return { success: false, error: 'Invoice not found' };

      const cancelTx = db.transaction(() => {
        db.prepare(`
          UPDATE sales_invoices SET
            status = 'cancelled',
            balance_due = 0,
            notes = COALESCE(notes, '') || ' [CANCELLED: ' || ? || ']',
            updated_at = datetime('now')
          WHERE id = ?
        `).run(reason || 'Cancelled by authorized user', id);

        // Reverse customer stats if it was previously finalized
        if (invoice.status === 'finalized' && invoice.customer_id) {
          db.prepare(`
            UPDATE customers SET
              total_bills = MAX(0, total_bills - 1),
              total_amount = MAX(0, total_amount - ?),
              updated_at = datetime('now')
            WHERE id = ?
          `).run(invoice.grand_total, invoice.customer_id);
        }
      });

      cancelTx();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sales:update', async (_event, id: number, data: any) => {
    try {
      const db = getDb();
      const existing = db.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(id) as any;
      if (!existing) return { success: false, error: 'Invoice not found' };

      db.prepare(`
        UPDATE sales_invoices SET
          notes = COALESCE(?, notes),
          payment_reference = COALESCE(?, payment_reference),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(data.notes ?? null, data.paymentReference ?? null, id);

      const updated = db.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // DEALER PURCHASE RECORDS (INTERNAL SUMMARY - NOT A TAX INVOICE)
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle('purchases:getAll', async (_event, filters?: { supplierId?: number; fyId?: number; status?: string }) => {
    try {
      const db = getDb();
      let query = `
        SELECT p.*, s.name as supplier_name, s.mobile as supplier_mobile, s.gstin as supplier_gstin,
               s.reference_number as supplier_reference
        FROM dealer_purchase_records p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.supplierId) {
        query += ' AND p.supplier_id = ?';
        params.push(filters.supplierId);
      }
      if (filters?.fyId) {
        query += ' AND p.financial_year_id = ?';
        params.push(filters.fyId);
      }
      if (filters?.status) {
        query += ' AND p.status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY p.record_date DESC, p.id DESC';
      const records = db.prepare(query).all(...params);
      return { success: true, data: records };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('purchases:getById', async (_event, id: number) => {
    try {
      const db = getDb();
      const record = db.prepare(`
        SELECT p.*, s.name as supplier_name, s.mobile as supplier_mobile, s.gstin as supplier_gstin,
               s.address as supplier_address, s.city as supplier_city, s.state as supplier_state,
               s.reference_number as supplier_reference
        FROM dealer_purchase_records p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.id = ?
      `).get(id) as any;

      if (!record) return { success: false, error: 'Purchase record not found' };

      const items = db.prepare(
        'SELECT * FROM dealer_purchase_items WHERE purchase_id = ? ORDER BY sort_order ASC, id ASC'
      ).all(id);

      const payments = db.prepare(
        "SELECT * FROM payments WHERE document_type = 'purchase' AND document_id = ? ORDER BY payment_date DESC, id DESC"
      ).all(id);

      return { success: true, data: { ...record, items, payments } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('purchases:create', async (_event, data: any) => {
    try {
      const db = getDb();

      const saveTransaction = db.transaction(() => {
        let supplierId = data.supplierId;

        // Auto-register supplier if not existing
        if (!supplierId && data.supplier) {
          let existingSupplier: any = null;
          if (data.supplier.gstin) {
            existingSupplier = db.prepare('SELECT id FROM suppliers WHERE gstin = ? AND is_active = 1').get(data.supplier.gstin);
          }
          if (!existingSupplier && data.supplier.mobile) {
            existingSupplier = db.prepare('SELECT id FROM suppliers WHERE mobile = ? AND is_active = 1').get(data.supplier.mobile);
          }

          if (existingSupplier) {
            supplierId = existingSupplier.id;
          } else {
            const lastSup = db.prepare(
              "SELECT reference_number FROM suppliers WHERE reference_number LIKE 'AGC-SUP-%' ORDER BY id DESC LIMIT 1"
            ).get() as any;
            let nextNum = 1;
            if (lastSup) {
              const lastNum = parseInt(lastSup.reference_number.split('-').pop(), 10);
              if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
            const refNumber = `AGC-SUP-${String(nextNum).padStart(4, '0')}`;

            const insertSup = db.prepare(`
              INSERT INTO suppliers (reference_number, name, mobile, address, city, state, state_code, gstin, first_transaction_date, last_transaction_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              refNumber,
              data.supplier.name,
              data.supplier.mobile || null,
              data.supplier.address || null,
              data.supplier.city || null,
              data.supplier.state || null,
              data.supplier.stateCode || null,
              data.supplier.gstin || null,
              data.recordDate,
              data.recordDate
            );
            supplierId = insertSup.lastInsertRowid;
          }
        }

        // Allocate AGC internal purchase sequence number (AGC/P/26-27/0001)
        let recordNumber = data.recordNumber;
        const isFinal = data.status === 'finalized';

        if (isFinal) {
          if (!recordNumber || recordNumber.startsWith('DRAFT-') || recordNumber.startsWith('EST-')) {
            const seq = db.prepare(
              "SELECT * FROM document_sequences WHERE category = 'purchase' AND financial_year_id = ?"
            ).get(data.financialYearId) as any;

            if (seq) {
              const nextSeqNum = seq.last_number + 1;
              db.prepare("UPDATE document_sequences SET last_number = ?, updated_at = datetime('now') WHERE id = ?")
                .run(nextSeqNum, seq.id);

              const fy = db.prepare('SELECT name FROM financial_years WHERE id = ?').get(data.financialYearId) as any;
              recordNumber = `${seq.prefix}/${fy?.name || '26-27'}/${String(nextSeqNum).padStart(4, '0')}`;
            } else {
              recordNumber = `AGC/P/26-27/${Date.now().toString().slice(-4)}`;
            }
          }
        } else {
          // Draft / Estimate mode: NEVER consume statutory sequence counter
          if (!recordNumber || recordNumber === 'EST-DRAFT' || (!recordNumber.startsWith('DRAFT-') && !recordNumber.startsWith('EST-'))) {
            recordNumber = getNextEstimateNumber(db);
          }
        }

        let paymentStatus = 'unpaid';
        if (data.amountPaid >= data.grandTotal && data.grandTotal > 0) {
          paymentStatus = 'paid';
        } else if (data.amountPaid > 0) {
          paymentStatus = 'partial';
        }

        const insertRecord = db.prepare(`
          INSERT INTO dealer_purchase_records (
            record_number, financial_year_id, supplier_id, original_invoice_number, original_invoice_date,
            record_date, subtotal, total_discount, taxable_amount, cgst_amount, sgst_amount, igst_amount,
            round_off, grand_total, amount_paid, balance_due, payment_status, status, attachment_path, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          recordNumber,
          data.financialYearId,
          supplierId || null,
          data.originalInvoiceNumber || null,
          data.originalInvoiceDate || null,
          data.recordDate,
          data.subtotal || 0,
          data.totalDiscount || 0,
          data.taxableAmount || 0,
          data.cgstAmount || 0,
          data.sgstAmount || 0,
          data.igstAmount || 0,
          data.roundOff || 0,
          data.grandTotal || 0,
          data.amountPaid || 0,
          data.balanceDue || 0,
          paymentStatus,
          data.status || 'saved',
          data.attachmentPath || null,
          data.notes || null
        );

        const purchaseId = insertRecord.lastInsertRowid;

        // Insert items
        if (Array.isArray(data.items) && data.items.length > 0) {
          const insertItem = db.prepare(`
            INSERT INTO dealer_purchase_items (
              purchase_id, description, category, hsn_code, quantity, gross_weight, net_weight,
              rate, taxable_value, gst_rate, cgst_amount, sgst_amount, igst_amount, total_value, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          data.items.forEach((item: any, idx: number) => {
            insertItem.run(
              purchaseId,
              item.description,
              item.category || 'Gold Bullion',
              item.hsnCode || '7108',
              item.quantity || 1,
              item.grossWeight || null,
              item.netWeight || null,
              item.ratePaise || 0,
              item.taxableValuePaise || 0,
              item.gstRate || 3,
              item.cgstAmountPaise || 0,
              item.sgstAmountPaise || 0,
              item.igstAmountPaise || 0,
              item.totalValuePaise || 0,
              idx
            );
          });
        }

        // Record initial payment if any
        if (data.amountPaid > 0) {
          db.prepare(`
            INSERT INTO payments (document_type, document_id, payment_date, payment_mode, amount, reference_number, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            'purchase',
            purchaseId,
            data.recordDate,
            data.paymentMode || 'bank_transfer',
            data.amountPaid,
            data.paymentReference || null,
            'Payment to supplier recorded'
          );
        }

        // Update supplier totals
        if (supplierId) {
          db.prepare(`
            UPDATE suppliers SET
              total_bills = total_bills + 1,
              total_amount = total_amount + ?,
              last_transaction_date = ?,
              updated_at = datetime('now')
            WHERE id = ?
          `).run(data.grandTotal || 0, data.recordDate, supplierId);
        }

        return purchaseId;
      });

      const purchaseId = saveTransaction();
      const saved = db.prepare('SELECT * FROM dealer_purchase_records WHERE id = ?').get(purchaseId);
      return { success: true, data: saved };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('purchases:update', async (_event, id: number, data: any) => {
    try {
      const db = getDb();
      const existing = db.prepare('SELECT * FROM dealer_purchase_records WHERE id = ?').get(id) as any;
      if (!existing) return { success: false, error: 'Purchase record not found' };

      db.prepare(`
        UPDATE dealer_purchase_records SET
          notes = COALESCE(?, notes),
          payment_reference = COALESCE(?, payment_reference),
          attachment_path = COALESCE(?, attachment_path),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(data.notes ?? null, data.paymentReference ?? null, data.attachmentPath ?? null, id);

      const updated = db.prepare('SELECT * FROM dealer_purchase_records WHERE id = ?').get(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('purchases:cancel', async (_event, id: number, reason: string) => {
    try {
      const db = getDb();
      const record = db.prepare('SELECT * FROM dealer_purchase_records WHERE id = ?').get(id) as any;
      if (!record) return { success: false, error: 'Purchase record not found' };

      const cancelTx = db.transaction(() => {
        db.prepare(`
          UPDATE dealer_purchase_records SET
            status = 'cancelled',
            balance_due = 0,
            notes = COALESCE(notes, '') || ' [CANCELLED: ' || ? || ']',
            updated_at = datetime('now')
          WHERE id = ?
        `).run(reason || 'Cancelled by authorized user', id);

        if (record.supplier_id) {
          db.prepare(`
            UPDATE suppliers SET
              total_bills = MAX(0, total_bills - 1),
              total_amount = MAX(0, total_amount - ?),
              updated_at = datetime('now')
            WHERE id = ?
          `).run(record.grand_total, record.supplier_id);
        }
      });

      cancelTx();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // SERVICE INVOICES
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle('services:getAll', async (_event, filters?: { customerId?: number; fyId?: number; status?: string }) => {
    try {
      const db = getDb();
      let query = `
        SELECT sv.*, c.name as customer_name, c.mobile as customer_mobile, c.reference_number as customer_reference
        FROM service_invoices sv
        LEFT JOIN customers c ON sv.customer_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.customerId) {
        query += ' AND sv.customer_id = ?';
        params.push(filters.customerId);
      }
      if (filters?.fyId) {
        query += ' AND sv.financial_year_id = ?';
        params.push(filters.fyId);
      }
      if (filters?.status) {
        query += ' AND sv.status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY sv.invoice_date DESC, sv.id DESC';
      const invoices = db.prepare(query).all(...params);
      return { success: true, data: invoices };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('services:getById', async (_event, id: number) => {
    try {
      const db = getDb();
      const invoice = db.prepare(`
        SELECT sv.*, c.name as customer_name, c.mobile as customer_mobile, c.address as customer_address, 
               c.gstin as customer_gstin, c.city as customer_city, c.state as customer_state,
               c.reference_number as customer_reference
        FROM service_invoices sv
        LEFT JOIN customers c ON sv.customer_id = c.id
        WHERE sv.id = ?
      `).get(id) as any;

      if (!invoice) return { success: false, error: 'Service invoice not found' };

      const items = db.prepare(
        'SELECT * FROM service_invoice_items WHERE invoice_id = ? ORDER BY sort_order ASC, id ASC'
      ).all(id);

      const payments = db.prepare(
        "SELECT * FROM payments WHERE document_type = 'service' AND document_id = ? ORDER BY payment_date DESC, id DESC"
      ).all(id);

      return { success: true, data: { ...invoice, items, payments } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('services:create', async (_event, data: any) => {
    try {
      const db = getDb();

      const saveTransaction = db.transaction(() => {
        let customerId = data.customerId;

        // Auto-register customer if customerId is not provided
        if (!customerId && data.customer) {
          let existingCustomer: any = null;
          if (data.customer.gstin) {
            existingCustomer = db.prepare('SELECT id FROM customers WHERE gstin = ? AND is_active = 1').get(data.customer.gstin);
          }
          if (!existingCustomer && data.customer.mobile) {
            existingCustomer = db.prepare('SELECT id FROM customers WHERE mobile = ? AND is_active = 1').get(data.customer.mobile);
          }

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const lastCus = db.prepare(
              "SELECT reference_number FROM customers WHERE reference_number LIKE 'AGC-CUS-%' ORDER BY id DESC LIMIT 1"
            ).get() as any;
            let nextNum = 1;
            if (lastCus) {
              const lastNum = parseInt(lastCus.reference_number.split('-').pop(), 10);
              if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
            const refNumber = `AGC-CUS-${String(nextNum).padStart(4, '0')}`;

            const insertCus = db.prepare(`
              INSERT INTO customers (reference_number, name, mobile, address, city, state, state_code, gstin, place_of_supply, first_transaction_date, last_transaction_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              refNumber,
              data.customer.name,
              data.customer.mobile || null,
              data.customer.address || null,
              data.customer.city || null,
              data.customer.state || null,
              data.customer.stateCode || null,
              data.customer.gstin || null,
              data.placeOfSupply || 'Karnataka',
              data.invoiceDate,
              data.invoiceDate
            );
            customerId = insertCus.lastInsertRowid;
          }
        }

        // Allocate service sequence number (AGC/SV/26-27/0001)
        let invoiceNumber = data.invoiceNumber;
        const isFinal = data.status === 'finalized';

        if (isFinal) {
          if (!invoiceNumber || invoiceNumber.startsWith('DRAFT-') || invoiceNumber.startsWith('EST-')) {
            const seq = db.prepare(
              "SELECT * FROM document_sequences WHERE category = 'service' AND financial_year_id = ?"
            ).get(data.financialYearId) as any;

            if (seq) {
              const nextSeqNum = seq.last_number + 1;
              db.prepare("UPDATE document_sequences SET last_number = ?, updated_at = datetime('now') WHERE id = ?")
                .run(nextSeqNum, seq.id);

              const fy = db.prepare('SELECT name FROM financial_years WHERE id = ?').get(data.financialYearId) as any;
              invoiceNumber = `${seq.prefix}/${fy?.name || '26-27'}/${String(nextSeqNum).padStart(4, '0')}`;
            } else {
              invoiceNumber = `AGC/SV/26-27/${Date.now().toString().slice(-4)}`;
            }
          }
        } else {
          // Draft / Estimate mode: NEVER consume statutory sequence counter
          if (!invoiceNumber || invoiceNumber === 'EST-DRAFT' || (!invoiceNumber.startsWith('DRAFT-') && !invoiceNumber.startsWith('EST-'))) {
            invoiceNumber = getNextEstimateNumber(db);
          }
        }

        let paymentStatus = 'unpaid';
        if (data.amountReceived >= data.grandTotal && data.grandTotal > 0) {
          paymentStatus = 'paid';
        } else if (data.amountReceived > 0) {
          paymentStatus = 'partial';
        }

        const insertInvoice = db.prepare(`
          INSERT INTO service_invoices (
            invoice_number, financial_year_id, customer_id, invoice_date, place_of_supply, supply_type,
            subtotal, total_discount, taxable_amount, cgst_amount, sgst_amount, igst_amount, round_off,
            grand_total, amount_received, balance_due, payment_status, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          invoiceNumber,
          data.financialYearId,
          customerId || null,
          data.invoiceDate,
          data.placeOfSupply || 'Karnataka',
          data.supplyType || 'intra',
          data.subtotal || 0,
          data.totalDiscount || 0,
          data.taxableAmount || 0,
          data.cgstAmount || 0,
          data.sgstAmount || 0,
          data.igstAmount || 0,
          data.roundOff || 0,
          data.grandTotal || 0,
          data.amountReceived || 0,
          data.balanceDue || 0,
          paymentStatus,
          data.status || 'draft',
          data.notes || null
        );

        const invoiceId = insertInvoice.lastInsertRowid;

        // Insert service line items with principal_amount and service_amount
        if (Array.isArray(data.items) && data.items.length > 0) {
          const insertItem = db.prepare(`
            INSERT INTO service_invoice_items (
              invoice_id, description, sac_code, quantity, rate, discount, taxable_value,
              gst_rate, cgst_amount, sgst_amount, igst_amount, total_value, sort_order,
              principal_amount, service_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          data.items.forEach((item: any, idx: number) => {
            const principalPaise = item.principalAmountPaise ?? (item.principalAmount ? Math.round(item.principalAmount * 100) : 0);
            const servicePaise = item.serviceAmountPaise ?? (item.serviceAmount ? Math.round(item.serviceAmount * 100) : (item.ratePaise || 0));

            insertItem.run(
              invoiceId,
              item.description,
              item.sacCode || '9971',
              item.quantity || 1,
              servicePaise,
              item.discountPaise || 0,
              item.taxableValuePaise || 0,
              item.gstRate || 18,
              item.cgstAmountPaise || 0,
              item.sgstAmountPaise || 0,
              item.igstAmountPaise || 0,
              item.totalValuePaise || 0,
              idx,
              principalPaise,
              servicePaise
            );
          });
        }

        if (data.amountReceived > 0) {
          db.prepare(`
            INSERT INTO payments (document_type, document_id, payment_date, payment_mode, amount, reference_number, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            'service',
            invoiceId,
            data.invoiceDate,
            data.paymentMode || 'cash',
            data.amountReceived,
            data.paymentReference || null,
            'Initial service fee payment'
          );
        }

        if (customerId && isFinal) {
          db.prepare(`
            UPDATE customers SET
              total_bills = total_bills + 1,
              total_amount = total_amount + ?,
              last_transaction_date = ?,
              updated_at = datetime('now')
            WHERE id = ?
          `).run(data.grandTotal || 0, data.invoiceDate, customerId);
        }

        return invoiceId;
      });

      const invoiceId = saveTransaction();
      const saved = db.prepare('SELECT * FROM service_invoices WHERE id = ?').get(invoiceId);
      return { success: true, data: saved };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('services:update', async (_event, id: number, data: any) => {
    try {
      const db = getDb();
      const existing = db.prepare('SELECT * FROM service_invoices WHERE id = ?').get(id) as any;
      if (!existing) return { success: false, error: 'Service invoice not found' };

      db.prepare(`
        UPDATE service_invoices SET
          notes = COALESCE(?, notes),
          payment_reference = COALESCE(?, payment_reference),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(data.notes ?? null, data.paymentReference ?? null, id);

      const updated = db.prepare('SELECT * FROM service_invoices WHERE id = ?').get(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('services:finalize', async (_event, id: number) => {
    try {
      const db = getDb();
      const invoice = db.prepare('SELECT * FROM service_invoices WHERE id = ?').get(id) as any;
      if (!invoice) return { success: false, error: 'Service invoice not found' };
      if (invoice.status === 'finalized') return { success: true, data: invoice };

      const finalizeTransaction = db.transaction(() => {
        let finalNumber = invoice.invoice_number;

        if (finalNumber.startsWith('DRAFT-') || finalNumber.includes('TMP')) {
          const seq = db.prepare(
            "SELECT * FROM document_sequences WHERE category = 'service' AND financial_year_id = ?"
          ).get(invoice.financial_year_id) as any;

          if (seq) {
            const nextSeqNum = seq.last_number + 1;
            db.prepare("UPDATE document_sequences SET last_number = ?, updated_at = datetime('now') WHERE id = ?")
              .run(nextSeqNum, seq.id);

            const fy = db.prepare('SELECT name FROM financial_years WHERE id = ?').get(invoice.financial_year_id) as any;
            finalNumber = `${seq.prefix}/${fy?.name || '26-27'}/${String(nextSeqNum).padStart(4, '0')}`;
          }
        }

        db.prepare(`
          UPDATE service_invoices SET
            invoice_number = ?,
            status = 'finalized',
            updated_at = datetime('now')
          WHERE id = ?
        `).run(finalNumber, id);

        if (invoice.customer_id) {
          db.prepare(`
            UPDATE customers SET
              total_bills = total_bills + 1,
              total_amount = total_amount + ?,
              last_transaction_date = ?,
              updated_at = datetime('now')
            WHERE id = ?
          `).run(invoice.grand_total, invoice.invoice_date, invoice.customer_id);
        }

        return finalNumber;
      });

      finalizeTransaction();
      const updated = db.prepare('SELECT * FROM service_invoices WHERE id = ?').get(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('services:cancel', async (_event, id: number, reason: string) => {
    try {
      const db = getDb();
      const invoice = db.prepare('SELECT * FROM service_invoices WHERE id = ?').get(id) as any;
      if (!invoice) return { success: false, error: 'Service invoice not found' };

      const cancelTx = db.transaction(() => {
        db.prepare(`
          UPDATE service_invoices SET
            status = 'cancelled',
            balance_due = 0,
            notes = COALESCE(notes, '') || ' [CANCELLED: ' || ? || ']',
            updated_at = datetime('now')
          WHERE id = ?
        `).run(reason || 'Cancelled by authorized user', id);

        if (invoice.status === 'finalized' && invoice.customer_id) {
          db.prepare(`
            UPDATE customers SET
              total_bills = MAX(0, total_bills - 1),
              total_amount = MAX(0, total_amount - ?),
              updated_at = datetime('now')
            WHERE id = ?
          `).run(invoice.grand_total, invoice.customer_id);
        }
      });

      cancelTx();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // PAYMENTS (PARTIAL / OUTSTANDING PAYMENTS)
  // ─────────────────────────────────────────────────────────────────

  ipcMain.handle('payments:create', async (_event, data: {
    documentType: 'sales' | 'purchase' | 'service';
    documentId: number;
    paymentDate: string;
    paymentMode: string;
    amount: number; // in paise
    referenceNumber?: string;
    notes?: string;
  }) => {
    try {
      const db = getDb();

      const paymentTx = db.transaction(() => {
        // 1. Record payment
        db.prepare(`
          INSERT INTO payments (document_type, document_id, payment_date, payment_mode, amount, reference_number, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          data.documentType,
          data.documentId,
          data.paymentDate,
          data.paymentMode,
          data.amount,
          data.referenceNumber || null,
          data.notes || null
        );

        // 2. Update balance on parent document
        if (data.documentType === 'sales') {
          const doc = db.prepare('SELECT grand_total, amount_received FROM sales_invoices WHERE id = ?').get(data.documentId) as any;
          if (doc) {
            const newReceived = doc.amount_received + data.amount;
            const newBalance = Math.max(0, doc.grand_total - newReceived);
            const newStatus = newBalance <= 0 ? 'paid' : 'partial';

            db.prepare(`
              UPDATE sales_invoices SET
                amount_received = ?,
                balance_due = ?,
                payment_status = ?,
                updated_at = datetime('now')
              WHERE id = ?
            `).run(newReceived, newBalance, newStatus, data.documentId);
          }
        } else if (data.documentType === 'purchase') {
          const doc = db.prepare('SELECT grand_total, amount_paid FROM dealer_purchase_records WHERE id = ?').get(data.documentId) as any;
          if (doc) {
            const newPaid = doc.amount_paid + data.amount;
            const newBalance = Math.max(0, doc.grand_total - newPaid);
            const newStatus = newBalance <= 0 ? 'paid' : 'partial';

            db.prepare(`
              UPDATE dealer_purchase_records SET
                amount_paid = ?,
                balance_due = ?,
                payment_status = ?,
                updated_at = datetime('now')
              WHERE id = ?
            `).run(newPaid, newBalance, newStatus, data.documentId);
          }
        } else if (data.documentType === 'service') {
          const doc = db.prepare('SELECT grand_total, amount_received FROM service_invoices WHERE id = ?').get(data.documentId) as any;
          if (doc) {
            const newReceived = doc.amount_received + data.amount;
            const newBalance = Math.max(0, doc.grand_total - newReceived);
            const newStatus = newBalance <= 0 ? 'paid' : 'partial';

            db.prepare(`
              UPDATE service_invoices SET
                amount_received = ?,
                balance_due = ?,
                payment_status = ?,
                updated_at = datetime('now')
              WHERE id = ?
            `).run(newReceived, newBalance, newStatus, data.documentId);
          }
        }
      });

      paymentTx();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('payments:getByDocument', async (_event, type: string, id: number) => {
    try {
      const db = getDb();
      const payments = db.prepare(
        'SELECT * FROM payments WHERE document_type = ? AND document_id = ? ORDER BY payment_date DESC, id DESC'
      ).all(type, id);
      return { success: true, data: payments };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ─── Draft Invoices / Estimation Register Handlers ─────────────────
  ipcMain.handle('drafts:getAll', async (_event, filters?: { category?: string; search?: string }) => {
    try {
      const db = getDb();
      const allDrafts: any[] = [];
      const cat = filters?.category || 'all';

      // 1. Sales Drafts
      if (cat === 'all' || cat === 'sales') {
        const sales = db.prepare(`
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
                 c.gstin as party_gstin
          FROM sales_invoices s
          LEFT JOIN customers c ON s.customer_id = c.id
          WHERE s.status = 'draft'
          ORDER BY s.id DESC
        `).all();
        allDrafts.push(...sales);
      }

      // 2. Dealer Purchase Drafts
      if (cat === 'all' || cat === 'purchase') {
        const purchases = db.prepare(`
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
                 s.gstin as party_gstin
          FROM dealer_purchase_records p
          LEFT JOIN suppliers s ON p.supplier_id = s.id
          WHERE p.status = 'draft'
          ORDER BY p.id DESC
        `).all();
        allDrafts.push(...purchases);
      }

      // 3. Service Drafts
      if (cat === 'all' || cat === 'service') {
        const services = db.prepare(`
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
                 c.gstin as party_gstin
          FROM service_invoices sv
          LEFT JOIN customers c ON sv.customer_id = c.id
          WHERE sv.status = 'draft'
          ORDER BY sv.id DESC
        `).all();
        allDrafts.push(...services);
      }

      allDrafts.sort((a, b) => (b.document_date || '').localeCompare(a.document_date || '') || b.id - a.id);

      if (filters?.search && filters.search.trim()) {
        const term = filters.search.trim().toLowerCase();
        const filtered = allDrafts.filter(d => 
          (d.document_number && d.document_number.toLowerCase().includes(term)) ||
          (d.party_name && d.party_name.toLowerCase().includes(term)) ||
          (d.party_mobile && d.party_mobile.toLowerCase().includes(term))
        );
        return { success: true, data: filtered };
      }

      return { success: true, data: allDrafts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('drafts:delete', async (_event, type: 'sales' | 'purchase' | 'service', id: number) => {
    try {
      const db = getDb();
      const deleteTransaction = db.transaction(() => {
        if (type === 'sales') {
          db.prepare("DELETE FROM sales_invoice_items WHERE invoice_id = ?").run(id);
          const res = db.prepare("DELETE FROM sales_invoices WHERE id = ? AND status = 'draft'").run(id);
          if (res.changes === 0) throw new Error('Sales draft not found or already finalized');
        } else if (type === 'purchase') {
          db.prepare("DELETE FROM dealer_purchase_items WHERE record_id = ?").run(id);
          const res = db.prepare("DELETE FROM dealer_purchase_records WHERE id = ? AND status = 'draft'").run(id);
          if (res.changes === 0) throw new Error('Purchase draft not found or already finalized');
        } else if (type === 'service') {
          db.prepare("DELETE FROM service_invoice_items WHERE invoice_id = ?").run(id);
          const res = db.prepare("DELETE FROM service_invoices WHERE id = ? AND status = 'draft'").run(id);
          if (res.changes === 0) throw new Error('Service draft not found or already finalized');
        }
      });
      deleteTransaction();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('drafts:getNextNumber', async () => {
    try {
      const db = getDb();
      return { success: true, data: getNextEstimateNumber(db) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
