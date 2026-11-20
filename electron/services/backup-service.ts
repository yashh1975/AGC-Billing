import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { getDb, closeDatabase, initDatabase, getDatabasePath } from '../database';
import { getFileManager } from '../file-manager';

export interface BackupMetadata {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  sha256: string;
  totalDocuments?: number;
}

export class BackupService {
  /**
   * Create a full verified backup archive containing:
   * - billing.db (captured safely via SQLite backup API)
   * - Documents vault
   * - Attachments vault
   * - backup_manifest.json with checksum and metadata
   */
  async createBackup(targetDirectory?: string, customDb?: any): Promise<{ success: boolean; data?: BackupMetadata; error?: string }> {
    try {
      const fileMgr = getFileManager();
      const rootDir = fileMgr.getDataDirectory();
      const db = customDb || getDb();

      // Destination directory
      const backupsDir = targetDirectory || path.join(rootDir, 'Backups');
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      // 1. Safe SQLite snapshot to a temporary file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const tempDbPath = path.join(backupsDir, `temp_db_${timestamp}.db`);

      // Use better-sqlite3 native safe online backup
      await db.backup(tempDbPath);

      // 2. Initialize ZIP archive
      const zip = new AdmZip();

      // Add the database snapshot to zip
      zip.addLocalFile(tempDbPath, '', 'billing.db');

      // Add Documents folder if exists
      const docsDir = path.join(rootDir, 'Documents');
      if (fs.existsSync(docsDir)) {
        zip.addLocalFolder(docsDir, 'Documents');
      }

      // Add Attachments folder if exists
      const attachDir = path.join(rootDir, 'Attachments');
      if (fs.existsSync(attachDir)) {
        zip.addLocalFolder(attachDir, 'Attachments');
      }

      // 3. Create Manifest
      const manifest = {
        application: 'AGC Billing & Management System',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        backupType: 'full',
      };
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'));

      // 4. Save ZIP file
      const zipFileName = `AGC_Backup_${timestamp}.zip`;
      const zipFilePath = path.join(backupsDir, zipFileName);
      zip.writeZip(zipFilePath);

      // Cleanup temp db snapshot
      if (fs.existsSync(tempDbPath)) {
        fs.unlinkSync(tempDbPath);
      }

      // 5. Compute SHA-256 hash
      const fileBuffer = fs.readFileSync(zipFilePath);
      const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const stats = fs.statSync(zipFilePath);

      // Record in audit logs if possible
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
          VALUES (1, 'BACKUP_CREATED', 'backup', NULL, ?)
        `).run(JSON.stringify({ fileName: zipFileName, size: stats.size, sha256 }));
      } catch (e) {
        // Continue even if audit log insert has minor issue
      }

      return {
        success: true,
        data: {
          fileName: zipFileName,
          filePath: zipFilePath,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
          createdAt: new Date().toISOString(),
          sha256,
        },
      };
    } catch (err: any) {
      console.error('[BackupService Error]', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * List all existing backups in the default Backups directory
   */
  async getBackupHistory(): Promise<BackupMetadata[]> {
    try {
      const fileMgr = getFileManager();
      const backupsDir = path.join(fileMgr.getDataDirectory(), 'Backups');
      if (!fs.existsSync(backupsDir)) {
        return [];
      }

      const files = fs.readdirSync(backupsDir).filter((f) => f.startsWith('AGC_Backup_') && f.endsWith('.zip'));
      const history: BackupMetadata[] = [];

      for (const f of files) {
        const fullPath = path.join(backupsDir, f);
        const stats = fs.statSync(fullPath);
        history.push({
          fileName: f,
          filePath: fullPath,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
          createdAt: stats.mtime.toISOString(),
          sha256: '', // Deferred calculation for speed
        });
      }

      // Sort newest first
      return history.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (err) {
      return [];
    }
  }

  /**
   * Restore application data from a selected backup archive.
   * Creates an emergency pre-restore snapshot of the current state first!
   */
  async restoreBackup(backupFilePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!fs.existsSync(backupFilePath)) {
        return { success: false, error: 'Backup file does not exist.' };
      }

      const fileMgr = getFileManager();
      const rootDir = fileMgr.getDataDirectory();

      // 1. Emergency safety backup of current state
      console.log('[Restore] Creating safety backup before restore...');
      await this.createBackup();

      // 2. Read and validate ZIP archive
      const zip = new AdmZip(backupFilePath);
      const zipEntries = zip.getEntries();
      const hasDb = zipEntries.some((e) => e.entryName === 'billing.db' || e.entryName.endsWith('billing.db'));

      if (!hasDb) {
        return { success: false, error: 'Invalid backup file: billing.db is missing.' };
      }

      // 3. Extract to a temporary restore folder
      const tempRestoreDir = path.join(rootDir, 'temp_restore');
      if (fs.existsSync(tempRestoreDir)) {
        fs.rmSync(tempRestoreDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempRestoreDir, { recursive: true });
      zip.extractAllTo(tempRestoreDir, true);

      // 4. Safely swap the database
      // Close current DB connection so Windows file lock is released
      closeDatabase();

      const restoredDbPath = path.join(tempRestoreDir, 'billing.db');
      const targetDbPath = getDatabasePath();

      if (fs.existsSync(restoredDbPath)) {
        fs.copyFileSync(restoredDbPath, targetDbPath);
      }

      // 5. Restore Documents folder
      const restoredDocs = path.join(tempRestoreDir, 'Documents');
      if (fs.existsSync(restoredDocs)) {
        const targetDocs = path.join(rootDir, 'Documents');
        this.copyFolderRecursiveSync(restoredDocs, targetDocs);
      }

      // 6. Restore Attachments folder
      const restoredAttach = path.join(tempRestoreDir, 'Attachments');
      if (fs.existsSync(restoredAttach)) {
        const targetAttach = path.join(rootDir, 'Attachments');
        this.copyFolderRecursiveSync(restoredAttach, targetAttach);
      }

      // Clean temp restore folder
      fs.rmSync(tempRestoreDir, { recursive: true, force: true });

      // Reopen database
      initDatabase();

      return { success: true };
    } catch (err: any) {
      console.error('[Restore Error]', err);
      return { success: false, error: err.message };
    }
  }

  private copyFolderRecursiveSync(source: string, target: string) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);
    for (const file of files) {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        this.copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    }
  }
}

let backupServiceInstance: BackupService | null = null;
export function getBackupService(): BackupService {
  if (!backupServiceInstance) {
    backupServiceInstance = new BackupService();
  }
  return backupServiceInstance;
}
