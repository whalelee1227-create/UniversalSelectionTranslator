import { execSync, exec, execFile } from 'child_process';
import log from 'electron-log';
import { SelectionResult } from '../shared/types';

export async function getSelectedText(): Promise<SelectionResult> {
  if (process.platform !== 'darwin') {
    return { success: false, error: 'Only macOS is supported for now' };
  }

  return new Promise((resolve) => {
    // Use AppleScript to get selected text via Accessibility API
    const script = `
      tell application "System Events"
        tell (first process whose frontmost is true)
          try
            set selectedText to value of attribute "AXSelectedText" of focused UI element
            if selectedText is "" then
              return ""
            end if
            return selectedText
          on error
            return ""
          end try
        end tell
      end tell
    `;

    // Use execFile with array args to avoid shell injection/quoting issues
    const scriptArgs = ['-e', script];
    execFile('osascript', scriptArgs, { timeout: 5000 }, (error, stdout) => {
      if (error) {
        log.error('AppleScript error:', error);
        resolve({ success: false, error: '无法获取选中文本 / Failed to get selected text' });
        return;
      }

      const text = stdout.trim();
      if (!text) {
        resolve({ success: false, error: '未选中文字 / No text selected' });
        return;
      }

      resolve({ success: true, text });
    });
  });
}

export function checkAccessibilityPermission(): boolean {
  if (process.platform !== 'darwin') {
    return false;
  }

  try {
    const result = execSync('osascript -e \'tell application "System Events" to return true\' 2>&1', {
      encoding: 'utf-8',
    });
    return result.includes('true');
  } catch {
    return false;
  }
}
