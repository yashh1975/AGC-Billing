import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

const DATA_FOLDER_NAME = 'AGC_Billing';

const MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'
];

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getDefaultDataDirectory(): string {
  // If documents path is intercepted by OneDrive, bypass it to prevent Windows cloud-filter freeze
  try {
    const docs = app.getPath('documents');
    if (!docs.toLowerCase().includes('onedrive') && fs.existsSync(docs)) {
      return path.join(docs, DATA_FOLDER_NAME);
    }
  } catch {}

  // Fallback to local user profile root (e.g. C:\Users\<Username>\AGC_Billing)
  const userProfile = process.env.USERPROFILE;
  if (userProfile && fs.existsSync(userProfile)) {
    return path.join(userProfile, DATA_FOLDER_NAME);
  }

  // Fallback to AppData userData
  try {
    return path.join(app.getPath('userData'), DATA_FOLDER_NAME);
  } catch {}

  return path.join(process.cwd(), DATA_FOLDER_NAME);
}

/**
 * Initialize the AGC_Billing data directory structure.
 * Uses Documents folder by default for persistence across app updates.
 */
export function initDataDirectory(basePath?: string): string {
  const root = basePath || getDefaultDataDirectory();
  ensureDirectoryExists(root);
  
  // Create base folders
  ensureDirectoryExists(path.join(root, 'Documents'));
  ensureDirectoryExists(path.join(root, 'Attachments', 'Supplier_Invoices'));
  ensureDirectoryExists(path.join(root, 'GST_Reports'));
  ensureDirectoryExists(path.join(root, 'Backups'));
  ensureDirectoryExists(path.join(root, 'Exports'));

  return root;
}

/**
 * Create year/month folder structure for a financial year.
 */
export function initFinancialYearFolders(basePath: string, fyName: string): void {
  const root = basePath || getDefaultDataDirectory();
  const categories = ['Sales', 'Dealer_Purchase', 'Service'];

  for (const category of categories) {
    for (const month of MONTHS) {
      ensureDirectoryExists(path.join(root, 'Documents', fyName, category, month));
    }
  }

  ensureDirectoryExists(path.join(root, 'Attachments', 'Supplier_Invoices', fyName));
  ensureDirectoryExists(path.join(root, 'GST_Reports', fyName));
  ensureDirectoryExists(path.join(root, 'Exports', fyName));
}

/**
 * Get the month name for a date (Indian FY aware).
 */
export function getMonthName(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[d.getMonth()];
}

/**
 * Get the financial year name for a date (April-March).
 */
export function getFinancialYearForDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed

  if (month >= 3) { // April (3) onwards
    const startYear = year % 100;
    const endYear = (year + 1) % 100;
    return `${startYear}-${String(endYear).padStart(2, '0')}`;
  } else { // Jan-Mar belongs to previous FY
    const startYear = (year - 1) % 100;
    const endYear = year % 100;
    return `${startYear}-${String(endYear).padStart(2, '0')}`;
  }
}

export function getDocumentPath(
  type: 'Sales' | 'Service' | 'Dealer_Purchase',
  financialYear: string,
  month: string,
  basePath?: string,
): string {
  const root = basePath || getDefaultDataDirectory();
  const dirPath = path.join(root, 'Documents', financialYear, type, month);
  ensureDirectoryExists(dirPath);
  return dirPath;
}

export function getAttachmentPath(financialYear: string, basePath?: string): string {
  const root = basePath || getDefaultDataDirectory();
  const dirPath = path.join(root, 'Attachments', 'Supplier_Invoices', financialYear);
  ensureDirectoryExists(dirPath);
  return dirPath;
}

export function getExportPath(financialYear: string, basePath?: string): string {
  const root = basePath || getDefaultDataDirectory();
  const dirPath = path.join(root, 'Exports', financialYear);
  ensureDirectoryExists(dirPath);
  return dirPath;
}

export function getGstReportPath(financialYear: string, basePath?: string): string {
  const root = basePath || getDefaultDataDirectory();
  const dirPath = path.join(root, 'GST_Reports', financialYear);
  ensureDirectoryExists(dirPath);
  return dirPath;
}

export function getBackupPath(basePath?: string): string {
  const root = basePath || getDefaultDataDirectory();
  const dirPath = path.join(root, 'Backups');
  ensureDirectoryExists(dirPath);
  return dirPath;
}

/**
 * Generate a standardized file name for documents.
 * Example: AGC-S-26-27-0001_2026-11-18.pdf
 */
let currentDataDirectory: string = '';

export function getFileManager() {
  return {
    getDataDirectory: () => {
      if ((global as any).__mockFileMgr) {
        return (global as any).__mockFileMgr.getDataDirectory();
      }
      if (currentDataDirectory) return currentDataDirectory;
      try {
        currentDataDirectory = getDefaultDataDirectory();
      } catch {
        currentDataDirectory = path.join(process.cwd(), 'AGC_Billing');
      }
      return currentDataDirectory;
    },
    setDataDirectory: (dir: string) => {
      currentDataDirectory = dir;
      initDataDirectory(dir);
    },
  };
}

export function generateFileName(
  type: string,
  documentNumber: string,
  date: Date | string,
): string {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const sanitized = documentNumber.replace(/[/\\?%*:|"<>]/g, '-');
  return `${sanitized}_${dateStr}.pdf`;
}
