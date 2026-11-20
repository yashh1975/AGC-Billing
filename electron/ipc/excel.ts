import { IpcMain } from 'electron';
import { getExcelService, ReportFilter } from '../services/excel-service';

export function registerExcelIpcHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('excel:exportReport', async (_event, filter: ReportFilter) => {
    try {
      const excelService = getExcelService();
      const result = await excelService.generateReport(filter);
      return { success: true, data: result };
    } catch (error: any) {
      console.error('[Excel Export Error]', error);
      return { success: false, error: error.message };
    }
  });
}
