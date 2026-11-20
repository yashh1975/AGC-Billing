import { IpcMain, dialog, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { getDataDirectory } from '../database';

export function registerFileHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('files:selectDirectory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Directory',
      });
      if (result.canceled) return { success: true, data: null };
      return { success: true, data: result.filePaths[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:selectFile', async (_event, filters?: Record<string, any>) => {
    try {
      const dialogFilters = filters?.filters || [
        { name: 'All Files', extensions: ['*'] },
      ];
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        title: filters?.title || 'Select File',
        filters: dialogFilters,
      });
      if (result.canceled) return { success: true, data: null };
      return { success: true, data: result.filePaths[0] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:openFile', async (_event, filePath: string) => {
    try {
      if (!filePath) {
        return { success: false, error: 'File path cannot be empty' };
      }
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `File not found at path: ${filePath}` };
      }
      const openErr = await shell.openPath(filePath);
      if (openErr) {
        return { success: false, error: openErr };
      }
      return { success: true, data: filePath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:openFolder', async (_event, folderPath: string) => {
    try {
      if (!folderPath) {
        return { success: false, error: 'Folder path cannot be empty' };
      }
      if (fs.existsSync(folderPath)) {
        shell.showItemInFolder(folderPath);
        return { success: true, data: folderPath };
      }
      const parentDir = path.dirname(folderPath);
      if (fs.existsSync(parentDir)) {
        await shell.openPath(parentDir);
        return { success: true, data: parentDir };
      }
      return { success: false, error: `Directory does not exist: ${folderPath}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:getDataDirectory', async () => {
    try {
      return { success: true, data: getDataDirectory() };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('files:setDataDirectory', async (_event, dirPath: string) => {
    try {
      // Store in app settings - actual migration would be more complex
      return { success: true, data: dirPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('whatsapp:share', async (_event, mobile: string, message: string, filePath?: string) => {
    try {
      // Clean mobile number
      let cleanMobile = mobile.replace(/[^0-9]/g, '');
      if (cleanMobile.length === 10) cleanMobile = '91' + cleanMobile;

      // Copy PDF file to Windows clipboard (CF_HDROP) and reveal in Explorer for seamless attachment
      if (filePath && fs.existsSync(filePath)) {
        try {
          const { exec } = require('node:child_process');
          exec(`powershell -NoProfile -Command "Set-Clipboard -Path '${filePath}'"`);
          shell.showItemInFolder(filePath);
        } catch {}
      }
      
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${cleanMobile}?text=${encodedMessage}`;
      
      await shell.openExternal(whatsappUrl);
      return { success: true, data: { fileCopied: !!filePath } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
