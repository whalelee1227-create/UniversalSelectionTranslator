import './style.css';

let initialized = false;

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
  if (initialized) return;
  initialized = true;

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