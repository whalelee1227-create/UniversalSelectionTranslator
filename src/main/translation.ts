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

    const result = await translate(request.text, {
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
