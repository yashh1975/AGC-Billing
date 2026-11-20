import { app, BrowserWindow, Menu, nativeImage, ipcMain, shell, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { initDatabase, closeDatabase } from '../database';
import { registerAllIpcHandlers } from '../ipc';
import { initDataDirectory } from '../file-manager';

// Disable hardware acceleration to guarantee flawless Windows stability across all GPUs
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

// File logger for production diagnostics
const logPath = path.join(process.env.USERPROFILE || 'C:\\', 'AGC_Billing_startup.log');
function logMessage(...args: any[]) {
  const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`;
  try { fs.appendFileSync(logPath, line); } catch {}
  console.log(...args);
}

process.on('uncaughtException', (error) => {
  logMessage('FATAL UNCAUGHT EXCEPTION:', error.stack || error);
  dialog.showErrorBox('AGC Billing - Startup Error', error.stack || error.message);
});

process.on('unhandledRejection', (reason) => {
  logMessage('UNHANDLED REJECTION:', reason);
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow(): void {
  logMessage('[App] Creating main window...');
  // Remove boilerplate "File Edit View Window" default application menu
  Menu.setApplicationMenu(null);

  const candidateIco = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'icon.ico')
    : path.join(__dirname, '../../build/icon.ico');
  const candidatePng = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'logo', 'agc-logo.png')
    : path.join(__dirname, '../../assets/logo/agc-logo.png');
  const iconPath = fs.existsSync(candidateIco) ? candidateIco : candidatePng;
  const appIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 650,
    title: 'AGC Billing & Management System',
    icon: appIcon,
    autoHideMenuBar: true,
    show: true,
    backgroundColor: '#FDFBF7',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();

  mainWindow.once('ready-to-show', () => {
    logMessage('[App] ready-to-show triggered');
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logMessage('[Window] Failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    logMessage('[Window] Renderer process gone:', JSON.stringify(details));
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    logMessage(`[Renderer] [L${level}] (${sourceId}:${line}) ${message}`);
  });

  mainWindow.on('close', () => {
    logMessage('[Window] Main window close event triggered');
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexPath = app.isPackaged
      ? path.join(app.getAppPath(), 'dist/index.html')
      : path.join(__dirname, '../../dist/index.html');
    logMessage('[App] Loading HTML:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      logMessage('[App] Failed to loadFile:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  logMessage('[App] whenReady triggered');

  try {
    initDatabase();
    logMessage('[App] Database initialized successfully');
  } catch (error: any) {
    logMessage('[App] Database initialization warning:', error.stack || error);
  }

  try {
    registerAllIpcHandlers(ipcMain);
    logMessage('[App] IPC handlers registered successfully');
  } catch (error: any) {
    logMessage('[App] IPC handlers warning:', error.stack || error);
  }

  // Create Window immediately
  createWindow();

  // Initialize data directory in parallel/after window creation
  try {
    initDataDirectory();
    logMessage('[App] Data directory initialized successfully');
  } catch (error: any) {
    logMessage('[App] Data directory warning:', error.stack || error);
  }
});

app.on('window-all-closed', () => {
  closeDatabase();
  app.quit();
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle getting main window for IPC
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
