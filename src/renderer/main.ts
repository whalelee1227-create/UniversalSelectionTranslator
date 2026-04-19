import './style.css';

let initialized = false;

interface TranslationResult {
  originalText: string;
  translatedText: string;
  pronunciation?: string;
  sourceLang: string;
  targetLang: string;
}

interface Settings {
  apiKey: string;
  shortcut: string;
  defaultSourceLang: string;
  defaultTargetLang: string;
}

declare global {
  interface Window {
    electronAPI: {
      onTranslationResult: (callback: (data: TranslationResult) => void) => void;
      onLanguageChange: (callback: (source: string, target: string) => void) => void;
      notifyRendererReady: () => void;
      closePanel: () => void;
      copyToClipboard: (text: string) => void;
      getSettings: () => Promise<Settings>;
      updateSettings: (settings: Partial<Settings>) => Promise<Settings>;
      retranslate: (sourceLang: string, targetLang: string) => void;
    };
  }
}

// Language names mapping
const langNames: Record<string, string> = {
  'auto': '自动',
  'en': 'EN',
  'zh': '中文',
  'ja': '日本語',
  'ko': '한국어',
  'fr': 'Français',
  'de': 'Deutsch',
  'es': 'Español'
};

document.addEventListener('DOMContentLoaded', () => {
  if (initialized) return;
  initialized = true;

  // Notify main process that renderer is ready
  window.electronAPI.notifyRendererReady();

  // Elements
  const originalTextEl = document.getElementById('original-text')!;
  const translatedTextEl = document.getElementById('translated-text')!;
  const sourceLangBtn = document.getElementById('source-lang') as HTMLButtonElement;
  const targetLangBtn = document.getElementById('target-lang') as HTMLButtonElement;
  const closeBtn = document.getElementById('close-btn')!;
  const copyOriginalBtn = document.getElementById('copy-original')!;
  const copyTranslatedBtn = document.getElementById('copy-translated')!;

  // Settings modal elements
  const settingsBtn = document.getElementById('settings-btn')!;
  const settingsModal = document.getElementById('settings-modal')!;
  const modalClose = document.getElementById('modal-close')!;
  const btnCancel = document.getElementById('btn-cancel')!;
  const btnSave = document.getElementById('btn-save')!;
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
  const shortcutInput = document.getElementById('shortcut') as HTMLInputElement;
  const sourceLangDefault = document.getElementById('source-lang-default') as HTMLSelectElement;
  const targetLangDefault = document.getElementById('target-lang-default') as HTMLSelectElement;

  // Language modal elements
  const langModal = document.getElementById('lang-modal')!;
  const modalTitle = document.getElementById('modal-title')!;

  let currentSourceLang = 'en';
  let currentTargetLang = 'zh';
  let selectingFor: 'source' | 'target' = 'source';

  // Update lang buttons display
  function updateLangDisplay() {
    sourceLangBtn.textContent = currentSourceLang === 'auto' ? '自动' : langNames[currentSourceLang] || currentSourceLang.toUpperCase();
    targetLangBtn.textContent = langNames[currentTargetLang] || currentTargetLang.toUpperCase();
  }

  // Listen for translation results
  window.electronAPI.onTranslationResult((data: TranslationResult) => {
    originalTextEl.textContent = data.originalText;
    translatedTextEl.textContent = data.translatedText;
    currentSourceLang = data.sourceLang;
    currentTargetLang = data.targetLang;
    updateLangDisplay();
  });

  // Close button
  closeBtn.addEventListener('click', () => {
    window.electronAPI.closePanel();
  });

  // Copy buttons
  copyOriginalBtn.addEventListener('click', () => {
    const text = originalTextEl.textContent;
    if (text) {
      window.electronAPI.copyToClipboard(text);
      showCopiedFeedback(copyOriginalBtn);
    }
  });

  copyTranslatedBtn.addEventListener('click', () => {
    const text = translatedTextEl.textContent;
    if (text) {
      window.electronAPI.copyToClipboard(text);
      showCopiedFeedback(copyTranslatedBtn);
    }
  });

  function showCopiedFeedback(btn: HTMLElement) {
    const originalText = btn.textContent;
    btn.textContent = '✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 1500);
  }

  // Language selector functions
  function openLangSelector(forTarget: 'source' | 'target') {
    selectingFor = forTarget;
    modalTitle.textContent = forTarget === 'source' ? '选择源语言' : '选择目标语言';
    document.querySelectorAll('.lang-option').forEach(opt => {
      const lang = (opt as HTMLElement).dataset.lang;
      const isActive = lang === (forTarget === 'source' ? currentSourceLang : currentTargetLang);
      opt.classList.toggle('active', isActive);
    });
    langModal.classList.remove('hidden');
  }

  // Open lang selectors
  sourceLangBtn.addEventListener('click', () => openLangSelector('source'));
  targetLangBtn.addEventListener('click', () => openLangSelector('target'));

  // Select language
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const lang = (opt as HTMLElement).dataset.lang;
      if (!lang) return;

      if (selectingFor === 'source') {
        currentSourceLang = lang;
      } else {
        currentTargetLang = lang;
      }
      updateLangDisplay();
      langModal.classList.add('hidden');

      // Trigger re-translation with new languages
      window.electronAPI.retranslate(currentSourceLang, currentTargetLang);
    });
  });

  // Close lang modal on background click
  langModal.addEventListener('click', (e) => {
    if (e.target === langModal) {
      langModal.classList.add('hidden');
    }
  });

  // Settings modal functions
  function openSettingsModal() {
    window.electronAPI.getSettings().then((settings: Settings) => {
      apiKeyInput.value = settings.apiKey || '';
      shortcutInput.value = settings.shortcut || '';
      sourceLangDefault.value = settings.defaultSourceLang || 'auto';
      targetLangDefault.value = settings.defaultTargetLang || 'zh';
    });
    settingsModal.classList.remove('hidden');
  }

  function closeSettingsModal() {
    settingsModal.classList.add('hidden');
  }

  async function saveSettings() {
    const newSettings: Partial<Settings> = {
      apiKey: apiKeyInput.value,
      shortcut: shortcutInput.value,
      defaultSourceLang: sourceLangDefault.value,
      defaultTargetLang: targetLangDefault.value,
    };
    await window.electronAPI.updateSettings(newSettings);
    closeSettingsModal();
  }

  // Settings modal event listeners
  settingsBtn.addEventListener('click', openSettingsModal);
  modalClose.addEventListener('click', closeSettingsModal);
  btnCancel.addEventListener('click', closeSettingsModal);
  btnSave.addEventListener('click', saveSettings);

  // Close modal when clicking outside
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  });
});
