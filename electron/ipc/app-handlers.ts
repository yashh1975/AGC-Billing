import { IpcMain, app, BrowserWindow } from 'electron';

export function registerAppHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('app:getVersion', async () => {
    return { success: true, data: app.getVersion() };
  });

  ipcMain.handle('app:quit', async () => {
    app.quit();
    return { success: true };
  });

  ipcMain.handle('app:minimize', async () => {
    const win = BrowserWindow.getFocusedWindow();
    win?.minimize();
    return { success: true };
  });

  ipcMain.handle('app:maximize', async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
    return { success: true };
  });

  ipcMain.handle('app:isMaximized', async () => {
    const win = BrowserWindow.getFocusedWindow();
    return { success: true, data: win?.isMaximized() ?? false };
  });

  ipcMain.handle('app:getPath', async (_event, name: string) => {
    try {
      const validPaths = ['home', 'appData', 'userData', 'desktop', 'documents', 'downloads'];
      if (!validPaths.includes(name)) {
        return { success: false, error: 'Invalid path name' };
      }
      return { success: true, data: app.getPath(name as any) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
