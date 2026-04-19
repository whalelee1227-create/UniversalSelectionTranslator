import { screen, BrowserWindow } from 'electron';
import path from 'path';
import log from 'electron-log';
import { TranslationResult } from '../shared/types';

let translationWindow: BrowserWindow | null = null;

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
    resizable: false,
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
  if (!translationWindow || translationWindow.isDestroyed()) {
    createTranslationWindow();
  }

  // Get mouse position
  const cursorPoint = screen.getCursorScreenPoint();

  // Calculate window position (offset from cursor)
  const offsetX = 20;
  const offsetY = 10;
  const windowWidth = 320;
  const windowHeight = 200;

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
  if (y + windowHeight > screenY + screenHeight) {
    y = cursorPoint.y - windowHeight - offsetY;
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
  translationWindow!.setSize(windowWidth, windowHeight);

  // Send data to renderer
  translationWindow!.webContents.send('translation-result', data);

  translationWindow!.show();
  translationWindow!.focus();

  log.info(`Translation window shown at (${x}, ${y})`);
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
    log.info('Translation window destroyed');
  }
}
