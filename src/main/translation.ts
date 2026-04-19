import translate, { Translator } from 'google-translate-api-x';
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

  // google-translate-api-x is a free API wrapper, API key is optional
  // But we check if user configured one in settings for future use
  try {
    log.info(`Translating: "${request.text}" from ${request.sourceLang} to ${request.targetLang}`);

    const translator = new Translator({ from: request.sourceLang, to: request.targetLang, forceTo: true });

    const result = await translator.translate(request.text);

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error('Translation error details:', errorMessage);
    return { success: false, error: `翻译服务出错: ${errorMessage}` };
  }
}
