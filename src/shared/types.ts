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
