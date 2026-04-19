import { screen, BrowserWindow } from 'electron';
import path from 'path';
import log from 'electron-log';
import { TranslationResult } from '../shared/types';
import { translateText } from './translation';

let translationWindow: BrowserWindow | null = null;
let pendingData: TranslationResult | null = null;
let rendererReadyCallback: (() => void) | null = null;
let currentOriginalText: string = '';

export function createTranslationWindow(): BrowserWindow {
  if (translationWindow && !translationWindow.isDestroyed()) {
    return translationWindow;
  }

  translationWindow = new BrowserWindow({
    width: 320,
    height: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  translationWindow.on('blur', () => {
    hideTranslationWindow();
  });

  // When window finishes loading, send pending data if any
  translationWindow.webContents.once('did-finish-load', () => {
    log.info('Translation window finished loading');
    if (pendingData && translationWindow && !translationWindow.isDestroyed()) {
      translationWindow.webContents.send('translation-result', pendingData);
      pendingData = null;
    }
  });

  // Load the renderer HTML
  if (process.env.NODE_ENV === 'production') {
    translationWindow.loadFile(path.join(__dirname, '..', '..', 'renderer', 'index.html'));
  } else {
    translationWindow.loadURL('http://localhost:5173');
  }

  log.info('Translation window created');

  return translationWindow;
}

export function showTranslationWindow(data: TranslationResult): void {
  // Store original text for re-translation
  currentOriginalText = data.originalText;

  // Store data to be sent after window loads
  pendingData = data;

  // Create window if needed
  if (!translationWindow || translationWindow.isDestroyed()) {
    // Set up callback for when renderer is ready
    rendererReadyCallback = () => {
      if (pendingData && translationWindow && !translationWindow.isDestroyed()) {
        log.info('Sending pending translation data to renderer');
        translationWindow.webContents.send('translation-result', pendingData);
        pendingData = null;
      }
      rendererReadyCallback = null;
    };
    createTranslationWindow();
  } else if (pendingData) {
    // Window already exists and is ready, send data immediately
    translationWindow.webContents.send('translation-result', pendingData);
    pendingData = null;
  }

  // Get mouse position
  const cursorPoint = screen.getCursorScreenPoint();

  // Calculate window position (offset from cursor)
  const offsetX = 20;
  const offsetY = 10;
  const windowWidth = 320;
  const minHeight = 120;
  const maxHeight = 600;

  // Calculate height based on content length
  const originalLen = data.originalText.length;
  const translatedLen = data.translatedText.length;
  const maxTextLen = Math.max(originalLen, translatedLen);

  // Estimate height: ~22px per line, ~22 chars per line
  let calculatedHeight = minHeight + Math.ceil(maxTextLen / 22) * 22;
  calculatedHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));

  // Get display bounds
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;
  const { x: screenX, y: screenY } = display.workArea;

  // Calculate position, ensuring window stays on screen
  let x = cursorPoint.x + offsetX;
  let y = cursorPoint.y + offsetY;

  if (x + windowWidth > screenX + screenWidth) {
    x = cursorPoint.x - windowWidth - offsetX;
  }
  if (y + calculatedHeight > screenY + screenHeight) {
    y = cursorPoint.y - calculatedHeight - offsetY;
  }
  // Ensure window stays within screen bounds (left edge)
  if (x < screenX) {
    x = screenX;
  }
  // Ensure window stays within screen bounds (top edge)
  if (y < screenY) {
    y = screenY;
  }

  translationWindow!.setPosition(Math.round(x), Math.round(y));
  translationWindow!.setSize(windowWidth, calculatedHeight);

  // Show window first, then data will be sent after load
  translationWindow!.show();
  translationWindow!.focus();

  log.info(`Translation window shown at (${x}, ${y}) with height ${calculatedHeight}`);
}

export function hideTranslationWindow(): void {
  if (translationWindow && !translationWindow.isDestroyed()) {
    translationWindow.hide();
    log.info('Translation window hidden');
  }
}

export function destroyTranslationWindow(): void {
  if (translationWindow && !translationWindow.isDestroyed()) {
    translationWindow.destroy();
    translationWindow = null;
    pendingData = null;
    currentOriginalText = '';
    log.info('Translation window destroyed');
  }
}

// Called when renderer sends 'renderer-ready' IPC message
export function onRendererReady(): void {
  log.info('Renderer ready signal received');
  if (rendererReadyCallback) {
    rendererReadyCallback();
  }
}

// Re-translate with different languages
export async function retranslateWithLanguages(sourceLang: string, targetLang: string): Promise<void> {
  if (!currentOriginalText) {
    log.warn('No text to re-translate');
    return;
  }

  if (!translationWindow || translationWindow.isDestroyed()) {
    log.warn('Translation window not available');
    return;
  }

  log.info(`Re-translating "${currentOriginalText}" from ${sourceLang} to ${targetLang}`);

  const result = await translateText({
    text: currentOriginalText,
    sourceLang,
    targetLang,
  });

  if (result.success) {
    const data: TranslationResult = {
      originalText: currentOriginalText,
      translatedText: result.data.translatedText,
      pronunciation: result.data.pronunciation,
      sourceLang: result.data.sourceLang,
      targetLang: result.data.targetLang,
    };

    translationWindow.webContents.send('translation-result', data);
  }
}
