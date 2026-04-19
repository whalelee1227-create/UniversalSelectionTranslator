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
  try {
    return store.get('settings', DEFAULT_SETTINGS);
  } catch (error) {
    log.error('Failed to get settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export function updateSettings(newSettings: Partial<Settings>): Settings {
  try {
    const currentSettings = getSettings();
    const merged = { ...currentSettings, ...newSettings };
    store.set('settings', merged);
    log.info('Settings updated:', merged);
    return merged;
  } catch (error) {
    log.error('Failed to update settings:', error);
    return getSettings();
  }
}

export function resetSettings(): Settings {
  try {
    store.set('settings', DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (error) {
    log.error('Failed to reset settings:', error);
    return DEFAULT_SETTINGS;
  }
}
