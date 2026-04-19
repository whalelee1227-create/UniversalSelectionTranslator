import { ipcMain, clipboard } from 'electron';
import log from 'electron-log';
import { getSettings, updateSettings } from './settings';
import { hideTranslationWindow, onRendererReady, retranslateWithLanguages } from './window';

export function registerIpcHandlers(): void {
  ipcMain.on('renderer-ready', () => {
    onRendererReady();
  });

  ipcMain.on('retranslate', (_event, sourceLang: string, targetLang: string) => {
    log.info(`Retranslate requested: ${sourceLang} -> ${targetLang}`);
    retranslateWithLanguages(sourceLang, targetLang);
  });

  ipcMain.on('close-panel', () => {
    log.info('Close panel requested');
    hideTranslationWindow();
  });

  ipcMain.on('copy-to-clipboard', (_event, text: string) => {
    if (typeof text !== 'string') {
      log.warn('copy-to-clipboard received non-string value');
      return;
    }
    clipboard.writeText(text);
    log.info('Text copied to clipboard');
  });

  ipcMain.handle('get-settings', () => {
    return getSettings();
  });

  ipcMain.handle('update-settings', (_event, newSettings) => {
    if (typeof newSettings !== 'object' || newSettings === null || Array.isArray(newSettings)) {
      throw new Error('Invalid settings object');
    }
    return updateSettings(newSettings);
  });

  log.info('IPC handlers registered');
}
