import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../database';
import {
  getDocumentPath,
  generateFileName,
  getMonthName,
  getFinancialYearForDate,
} from '../file-manager';

export interface SavePdfParams {
  type: 'Sales' | 'Dealer_Purchase' | 'Service';
  documentId: number;
  documentNumber: string;
  documentDate: string;
  pdfBase64: string; // Base64 encoded PDF bytes
}

export function savePdfDocument(params: SavePdfParams): {
  success: boolean;
  data?: { filePath: string };
  filePath?: string;
  error?: string;
} {
  try {
    const db = getDb();

    // 1. Determine Financial Year and Month from the actual document date
    const fyName = getFinancialYearForDate(params.documentDate);
    const monthName = getMonthName(params.documentDate);

    // 2. Resolve destination directory
    const folderPath = getDocumentPath(params.type, fyName, monthName);

    // 3. Generate standardized file name: AGC-S-26-27-0001_2026-11-18.pdf
    const fileName = generateFileName(params.type, params.documentNumber, params.documentDate);
    let targetFilePath = path.join(folderPath, fileName);

    // 4. Write PDF binary to disk (safely handling Windows EBUSY locks if opened in browser/reader)
    const buffer = Buffer.from(params.pdfBase64, 'base64');
    try {
      fs.writeFileSync(targetFilePath, buffer);
    } catch (writeErr: any) {
      if (writeErr.code === 'EBUSY' || writeErr.code === 'EPERM') {
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        const altFileName = `${base}_${Date.now()}${ext}`;
        targetFilePath = path.join(folderPath, altFileName);
        fs.writeFileSync(targetFilePath, buffer);
      } else {
        throw writeErr;
      }
    }

    const fullFilePath = targetFilePath;

    // 5. Update database record with persistent path
    if (params.documentId && params.documentId > 0) {
      if (params.type === 'Sales') {
        db.prepare("UPDATE sales_invoices SET pdf_path = ?, updated_at = datetime('now') WHERE id = ?")
          .run(fullFilePath, params.documentId);
      } else if (params.type === 'Dealer_Purchase') {
        db.prepare("UPDATE dealer_purchase_records SET pdf_path = ?, updated_at = datetime('now') WHERE id = ?")
          .run(fullFilePath, params.documentId);
      } else if (params.type === 'Service') {
        db.prepare("UPDATE service_invoices SET pdf_path = ?, updated_at = datetime('now') WHERE id = ?")
          .run(fullFilePath, params.documentId);
      }

      // 6. Record in document_files (clean up previous record if overwriting)
      db.prepare("DELETE FROM document_files WHERE document_type = ? AND document_id = ? AND file_type = 'pdf'")
        .run(params.type.toLowerCase(), params.documentId);

      const stats = fs.statSync(fullFilePath);
      db.prepare(`
        INSERT INTO document_files (document_type, document_id, file_type, file_name, file_path, file_size)
        VALUES (?, ?, 'pdf', ?, ?, ?)
      `).run(
        params.type.toLowerCase(),
        params.documentId,
        fileName,
        fullFilePath,
        stats.size
      );
    }

    return {
      success: true,
      data: { filePath: fullFilePath },
      filePath: fullFilePath,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
