# Translation Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a global translation tool that shows a popup panel near the mouse when user selects text and presses a shortcut key.

**Architecture:** Electron-based desktop app with global shortcut listener, macOS Accessibility API integration for text selection capture, Google Translate API for translation, and a frameless popup window for results.

**Tech Stack:** Electron, TypeScript, Google Translate API, electron-store, electron-log

---

## File Structure

```
translation-panel/
├── package.json
├── tsconfig.json
├── vite.config.ts              # Vite for renderer bundling
├── vite.main.config.ts         # Vite for main process
├── electron-builder.json
├── src/
│   ├── main/
│   │   ├── index.ts            # Main process entry
│   │   ├── shortcut.ts        # Global shortcut registration
│   │   ├── selection.ts        # macOS Accessibility API text capture
│   │   ├── translation.ts      # Google Translate API wrapper
│   │   ├── window.ts          # Translation popup window manager
│   │   └── ipc-handlers.ts     # IPC communication handlers
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.ts
│   │   ├── style.css
│   │   └── components/
│   │       └── TranslationPanel.ts
│   ├── preload/
│   │   └── index.ts            # Preload script for IPC bridge
│   └── shared/
│       └── types.ts            # Shared TypeScript types
└── README.md
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vite.main.config.ts`
- Create: `electron-builder.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "translation-panel",
  "version": "1.0.0",
  "description": "Global translation panel for any application",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:main\" \"npm run dev:renderer\"",
    "dev:main": "tsc -p tsconfig.main.json && electron .",
    "dev:renderer": "vite",
    "build": "npm run build:renderer && npm run build:main",
    "build:main": "tsc -p tsconfig.main.json",
    "build:renderer": "vite build",
    "start": "electron ."
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.4.0",
    "concurrently": "^8.2.0",
    "electron-builder": "^24.9.0"
  },
  "dependencies": {
    "electron-store": "^8.1.0",
    "electron-log": "^5.0.0",
    "google-translate-api-x": "^10.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

- [ ] **Step 4: Create tsconfig.main.json for main process**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist/main",
    "rootDir": "src/main",
    "resolveJsonModule": true
  },
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*"]
}
```

- [ ] **Step 5: Create electron-builder.json**

```json
{
  "appId": "com.translation-panel.app",
  "productName": "Translation Panel",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "entitlements": " entitlements.mac.plist"
  }
}
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`

- [ ] **Step 7: Commit**

```bash
git init
git add package.json tsconfig.json vite.config.ts tsconfig.main.json electron-builder.json
git commit -m "chore: project scaffolding"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/shared/types.ts`

- [ ] **Step 1: Create shared types**

```typescript
export interface TranslationResult {
  originalText: string;
  translatedText: string;
  pronunciation?: string;
  sourceLang: string;
  targetLang: string;
}

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface Settings {
  apiKey: string;
  shortcut: string;
  defaultSourceLang: string;
  defaultTargetLang: string;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  shortcut: 'CommandOrControl+Shift+T',
  defaultSourceLang: 'en',
  defaultTargetLang: 'zh',
};

export type SelectionResult =
  | { success: true; text: string }
  | { success: false; error: string };
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add shared types"
```

---

## Task 3: Main Process Entry

**Files:**
- Create: `src/main/index.ts`

- [ ] **Step 1: Create main/index.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: main process entry with logging and error handling"
```

---

## Task 4: Global Shortcut Registration

**Files:**
- Create: `src/main/shortcut.ts`

- [ ] **Step 1: Create shortcut.ts**

```typescript
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
    log.warn('Failed to get selected text:', selection.error);
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
```

- [ ] **Step 2: Commit**

```bash
git add src/main/shortcut.ts
git commit -m "feat: global shortcut registration and handler"
```

---

## Task 5: Text Selection via macOS Accessibility API

**Files:**
- Create: `src/main/selection.ts`

- [ ] **Step 1: Create selection.ts**

```typescript
import { execSync, exec } from 'child_process';
import log from 'electron-log';
import { SelectionResult } from '../shared/types';

export async function getSelectedText(): Promise<SelectionResult> {
  if (process.platform !== 'darwin') {
    return { success: false, error: 'Only macOS is supported for now' };
  }

  return new Promise((resolve) => {
    try {
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

      exec('osascript -e \'' + script + '\'', { timeout: 5000 }, (error, stdout) => {
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
    } catch (error) {
      log.error('Selection error:', error);
      resolve({ success: false, error: '获取选中文字失败 / Failed to get selected text' });
    }
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
```

- [ ] **Step 2: Commit**

```bash
git add src/main/selection.ts
git commit -m "feat: macOS Accessibility API text selection"
```

---

## Task 6: Translation Service

**Files:**
- Create: `src/main/translation.ts`

- [ ] **Step 1: Create translation.ts**

```typescript
import { Translate } from 'google-translate-api-x';
import log from 'electron-log';
import { TranslationRequest, TranslationResult } from '../shared/types';
import { getSettings } from './settings';

interface TranslateResult {
  success: true;
  data: TranslationResult;
}

interface TranslateError {
  success: false;
  error: string;
}

export async function translateText(request: TranslationRequest): Promise<TranslateResult | TranslateError> {
  const settings = getSettings();

  if (!settings.apiKey) {
    return { success: false, error: '请先在设置中配置 Google Translate API Key' };
  }

  try {
    log.info(`Translating: "${request.text}" from ${request.sourceLang} to ${request.targetLang}`);

    const translate = new Translate({ key: settings.apiKey });

    const result = await translate(result.text, {
      from: request.sourceLang,
      to: request.targetLang,
    });

    const translation: TranslationResult = {
      originalText: request.text,
      translatedText: result.text,
      pronunciation: result.pronunciation,
      sourceLang: result.from.language.iso,
      targetLang: request.targetLang,
    };

    log.info(`Translation result: "${result.text}"`);

    return { success: true, data: translation };
  } catch (error) {
    log.error('Translation error:', error);
    return { success: false, error: '翻译服务出错 / Translation service error' };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/translation.ts
git commit -m "feat: Google Translate API integration"
```

---

## Task 7: Settings Management

**Files:**
- Create: `src/main/settings.ts`

- [ ] **Step 1: Create settings.ts**

```typescript
import Store from 'electron-store';
import log from 'electron-log';
import { Settings, DEFAULT_SETTINGS } from '../shared/types';

const store = new Store<{ settings: Settings }>({
  name: 'settings',
  defaults: {
    settings: DEFAULT_SETTINGS,
  },
});

export function getSettings(): Settings {
  return store.get('settings', DEFAULT_SETTINGS);
}

export function updateSettings(newSettings: Partial<Settings>): Settings {
  const currentSettings = getSettings();
  const merged = { ...currentSettings, ...newSettings };
  store.set('settings', merged);
  log.info('Settings updated:', merged);
  return merged;
}

export function resetSettings(): Settings {
  store.set('settings', DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/settings.ts
git commit -m "feat: settings management with electron-store"
```

---

## Task 8: Window Management

**Files:**
- Create: `src/main/window.ts`

- [ ] **Step 1: Create window.ts**

```typescript
import { screen, BrowserWindow } from 'electron';
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
      preload: './dist/preload/index.js',
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  translationWindow.on('blur', () => {
    hideTranslationWindow();
  });

  // Load the renderer HTML
  if (process.env.NODE_ENV === 'production') {
    translationWindow.loadFile('./dist/renderer/index.html');
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
```

- [ ] **Step 2: Commit**

```bash
git add src/main/window.ts
git commit -m "feat: translation window management with cursor-follow positioning"
```

---

## Task 9: Preload Script & IPC

**Files:**
- Create: `src/preload/index.ts`

- [ ] **Step 1: Create preload/index.ts**

```typescript
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
```

- [ ] **Step 2: Create main/ipc-handlers.ts**

```typescript
import { ipcMain, clipboard } from 'electron';
import log from 'electron-log';
import { getSettings, updateSettings } from './settings';
import { hideTranslationWindow } from './window';

export function registerIpcHandlers(): void {
  ipcMain.on('close-panel', () => {
    log.info('Close panel requested');
    hideTranslationWindow();
  });

  ipcMain.on('copy-to-clipboard', (_event, text: string) => {
    clipboard.writeText(text);
    log.info(`Copied to clipboard: "${text}"`);
  });

  ipcMain.handle('get-settings', () => {
    return getSettings();
  });

  ipcMain.handle('update-settings', (_event, newSettings) => {
    return updateSettings(newSettings);
  });

  log.info('IPC handlers registered');
}
```

- [ ] **Step 3: Commit**

```bash
git add src/preload/index.ts src/main/ipc-handlers.ts
git commit -m "feat: preload script and IPC handlers"
```

---

## Task 10: Renderer UI

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.ts`
- Create: `src/renderer/style.css`

- [ ] **Step 1: Create src/renderer/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Translation Panel</title>
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <div id="app">
    <div class="panel">
      <div class="header">
        <span class="lang-badge" id="lang-badge">EN → ZH</span>
        <button class="close-btn" id="close-btn">×</button>
      </div>
      <div class="content">
        <div class="original-section">
          <div class="label">原文 / Original</div>
          <div class="text original-text" id="original-text"></div>
        </div>
        <div class="translation-section">
          <div class="label">翻译 / Translation</div>
          <div class="text translation-text" id="translation-text"></div>
        </div>
        <div class="pronunciation-section" id="pronunciation-section" style="display: none;">
          <div class="label">发音 / Pronunciation</div>
          <div class="text pronunciation-text" id="pronunciation-text"></div>
        </div>
      </div>
      <div class="footer">
        <button class="copy-btn" id="copy-original">复制原文</button>
        <button class="copy-btn primary" id="copy-translation">复制翻译</button>
      </div>
    </div>
  </div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Create src/renderer/style.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: transparent;
  -webkit-app-region: no-drag;
}

#app {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel {
  width: 320px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  -webkit-app-region: drag;
}

.lang-badge {
  font-size: 11px;
  color: #666;
  font-weight: 500;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  border-radius: 4px;
  -webkit-app-region: no-drag;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #666;
}

.content {
  padding: 12px;
}

.label {
  font-size: 10px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.text {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  word-break: break-word;
}

.original-text {
  color: #666;
  margin-bottom: 12px;
}

.translation-text {
  font-weight: 500;
}

.pronunciation-section {
  margin-top: 8px;
}

.pronunciation-text {
  font-size: 13px;
  color: #888;
  font-style: italic;
}

.footer {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.copy-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: transparent;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.15s ease;
}

.copy-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.copy-btn.primary {
  background: #007AFF;
  border-color: #007AFF;
  color: white;
}

.copy-btn.primary:hover {
  background: #0066DD;
}
```

- [ ] **Step 3: Create src/renderer/main.ts**

```typescript
import './style.css';

interface TranslationResult {
  originalText: string;
  translatedText: string;
  pronunciation?: string;
  sourceLang: string;
  targetLang: string;
}

declare global {
  interface Window {
    electronAPI: {
      onTranslationResult: (callback: (data: TranslationResult) => void) => void;
      closePanel: () => void;
      copyToClipboard: (text: string) => void;
      getSettings: () => Promise<any>;
      updateSettings: (settings: any) => Promise<any>;
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const originalTextEl = document.getElementById('original-text')!;
  const translationTextEl = document.getElementById('translation-text')!;
  const pronunciationEl = document.getElementById('pronunciation-section')!;
  const pronunciationTextEl = document.getElementById('pronunciation-text')!;
  const langBadgeEl = document.getElementById('lang-badge')!;
  const closeBtn = document.getElementById('close-btn')!;
  const copyOriginalBtn = document.getElementById('copy-original')!;
  const copyTranslationBtn = document.getElementById('copy-translation')!;

  // Listen for translation results
  window.electronAPI.onTranslationResult((data: TranslationResult) => {
    originalTextEl.textContent = data.originalText;
    translationTextEl.textContent = data.translatedText;
    langBadgeEl.textContent = `${data.sourceLang.toUpperCase()} → ${data.targetLang.toUpperCase()}`;

    if (data.pronunciation) {
      pronunciationEl.style.display = 'block';
      pronunciationTextEl.textContent = data.pronunciation;
    } else {
      pronunciationEl.style.display = 'none';
    }
  });

  // Close button
  closeBtn.addEventListener('click', () => {
    window.electronAPI.closePanel();
  });

  // Copy original text
  copyOriginalBtn.addEventListener('click', () => {
    const text = originalTextEl.textContent;
    if (text) {
      window.electronAPI.copyToClipboard(text);
    }
  });

  // Copy translation
  copyTranslationBtn.addEventListener('click', () => {
    const text = translationTextEl.textContent;
    if (text) {
      window.electronAPI.copyToClipboard(text);
    }
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/index.html src/renderer/style.css src/renderer/main.ts
git commit -m "feat: renderer UI for translation panel"
```

---

## Task 11: macOS Entitlements

**Files:**
- Create: `entitlements.mac.plist`

- [ ] **Step 1: Create entitlements file for Accessibility permission**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.app-sandbox</key>
  <false/>
</dict>
</plist>
```

Note: Users will need to grant "Accessibility" permission in System Preferences > Security & Privacy > Privacy > Accessibility.

- [ ] **Step 2: Commit**

```bash
git add entitlements.mac.plist
git commit -m "chore: macOS entitlements for Accessibility permission"
```

---

## Task 12: Build & Test

- [ ] **Step 1: Run development mode**

Run: `npm run dev`

Expected: App starts, global shortcut `Cmd+Shift+T` registered

- [ ] **Step 2: Test full flow**

1. Open any app (e.g., Safari)
2. Select some text
3. Press `Cmd+Shift+T`
4. Translation panel should appear near cursor
5. Click "复制翻译" should copy translation

- [ ] **Step 3: Build production**

Run: `npm run build`

- [ ] **Step 4: Verify dist folder**

Run: `ls dist/`

Expected: `dist/main/`, `dist/renderer/`, `dist/preload/` folders exist

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete translation panel implementation"
```

---

## Self-Review Checklist

- [ ] All spec requirements covered (global shortcut, text selection, translation, panel UI, copy)
- [ ] No placeholder/TODO in code
- [ ] Types consistent across modules
- [ ] Error handling for: no selection, translation failure, permission denied
- [ ] macOS Accessibility permission requirement documented

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
