import { IpcMain } from 'electron';
import { getBackupService } from '../services/backup-service';

export function registerBackupIpcHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('backup:create', async (_event, targetDir?: string) => {
    try {
      const backupService = getBackupService();
      const result = await backupService.createBackup(targetDir);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:getHistory', async () => {
    try {
      const backupService = getBackupService();
      const history = await backupService.getBackupHistory();
      return { success: true, data: history };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backup:restore', async (_event, backupPath: string) => {
    try {
      const backupService = getBackupService();
      const result = await backupService.restoreBackup(backupPath);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
