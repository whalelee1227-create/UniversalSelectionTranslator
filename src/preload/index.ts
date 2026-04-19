import { contextBridge, ipcRenderer } from 'electron';
import { TranslationResult, Settings } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // Receive translation result
  onTranslationResult: (callback: (data: TranslationResult) => void) => {
    ipcRenderer.on('translation-result', (_event, data) => callback(data));
  },

  // Close translation panel
  closePanel: () => ipcRenderer.send('close-panel'),

  // Copy to clipboard
  copyToClipboard: (text: string) => ipcRenderer.send('copy-to-clipboard', text),

  // Settings
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke('update-settings', settings),
});
