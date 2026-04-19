import { app, BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log';
import { registerShortcut, unregisterAllShortcuts } from './shortcut';
import { createTranslationWindow, destroyTranslationWindow, showTranslationWindow } from './window';
import { registerIpcHandlers } from './ipc-handlers';

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

log.info('App starting...');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: './dist/preload/index.js',
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Only load if not in production
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  log.info('App ready');

  // Create the main window (hidden, used for IPC only)
  await createWindow();
  mainWindow?.hide();

  // Register IPC handlers
  registerIpcHandlers();

  // Register global shortcut
  registerShortcut();

  log.info('App initialized successfully');
});

app.on('window-all-closed', () => {
  unregisterAllShortcuts();
  destroyTranslationWindow();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  unregisterAllShortcuts();
  destroyTranslationWindow();
});
