import { execSync, execFile } from 'child_process';
import log from 'electron-log';
import { SelectionResult } from '../shared/types';

export async function getSelectedText(): Promise<SelectionResult> {
  if (process.platform !== 'darwin') {
    return { success: false, error: 'Only macOS is supported for now' };
  }

  return new Promise((resolve) => {
    try {
      // Use pbpaste for more reliable clipboard reading on macOS
      const clipboardText = execSync('pbpaste', { encoding: 'utf-8', timeout: 5000 });
      const text = clipboardText.trim();

      if (!text) {
        log.warn('Clipboard is empty');
        resolve({ success: false, error: '剪贴板为空 / Clipboard is empty' });
        return;
      }

      log.info(`Selected text from clipboard: "${text}"`);
      resolve({ success: true, text });
    } catch (error) {
      log.error('Failed to read clipboard:', error);
      resolve({ success: false, error: '无法读取剪贴板 / Failed to read clipboard' });
    }
  });
}

export function checkAccessibilityPermission(): boolean {
  // No accessibility permission needed for clipboard access
  return true;
}
