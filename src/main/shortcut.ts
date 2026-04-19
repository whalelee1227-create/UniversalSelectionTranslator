import { globalShortcut } from 'electron';
import log from 'electron-log';
import { getSelectedText, SelectionResult } from './selection';
import { translateText } from './translation';
import { showTranslationWindow } from './window';
import { getSettings } from './settings';

export function registerShortcut(): void {
  const settings = getSettings();
  const shortcut = settings.shortcut || 'CommandOrControl+Shift+T';

  const success = globalShortcut.register(shortcut, async () => {
    log.info('Shortcut triggered');
    await handleShortcut();
  });

  if (success) {
    log.info(`Global shortcut registered: ${shortcut}`);
  } else {
    log.error(`Failed to register global shortcut: ${shortcut}`);
  }
}

export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll();
  log.info('All shortcuts unregistered');
}

async function handleShortcut(): Promise<void> {
  const selection: SelectionResult = await getSelectedText();

  if (!selection.success) {
    log.warn(`Failed to get selected text: ${selection.error}`);
    showTranslationWindow({
      originalText: '',
      translatedText: selection.error,
      sourceLang: 'auto',
      targetLang: 'auto',
    });
    return;
  }

  const selectedText = selection.text.trim();

  if (!selectedText) {
    showTranslationWindow({
      originalText: '',
      translatedText: '请先选中文字 / Please select text first',
      sourceLang: 'auto',
      targetLang: 'auto',
    });
    return;
  }

  log.info(`Selected text: "${selectedText}"`);

  const settings = getSettings();
  const result = await translateText({
    text: selectedText,
    sourceLang: settings.defaultSourceLang,
    targetLang: settings.defaultTargetLang,
  });

  if (result.success) {
    showTranslationWindow(result.data);
  } else {
    showTranslationWindow({
      originalText: selectedText,
      translatedText: `翻译失败: ${result.error}`,
      sourceLang: settings.defaultSourceLang,
      targetLang: settings.defaultTargetLang,
    });
  }
}