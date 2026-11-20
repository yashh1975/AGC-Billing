import { IpcMain } from 'electron';
import { registerAuthHandlers } from './auth';
import { registerCustomerHandlers } from './customers';
import { registerSupplierHandlers } from './suppliers';
import { registerSettingsHandlers } from './settings';
import { registerFinancialYearHandlers } from './financial-years';
import { registerDashboardHandlers } from './dashboard';
import { registerFileHandlers } from './files';
import { registerAppHandlers } from './app-handlers';
import { registerBillingIpcHandlers } from './billing';
import { registerPdfIpcHandlers } from './pdf';
import { registerSearchHandlers } from './search';
import { registerExcelIpcHandlers } from './excel';
import { registerBackupIpcHandlers } from './backup';

export function registerAllIpcHandlers(ipcMain: IpcMain): void {
  registerAuthHandlers(ipcMain);
  registerCustomerHandlers(ipcMain);
  registerSupplierHandlers(ipcMain);
  registerSettingsHandlers(ipcMain);
  registerFinancialYearHandlers(ipcMain);
  registerDashboardHandlers(ipcMain);
  registerFileHandlers(ipcMain);
  registerAppHandlers(ipcMain);
  registerBillingIpcHandlers(ipcMain);
  registerPdfIpcHandlers(ipcMain);
  registerSearchHandlers(ipcMain);
  registerExcelIpcHandlers(ipcMain);
  registerBackupIpcHandlers(ipcMain);
}
