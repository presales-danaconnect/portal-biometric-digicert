import en from './en.json';
import es from './es.json';

export type Language = 'en' | 'es';

const dictionaries = { en, es };

export function resolveLanguage(): Language {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang');
  return lang === 'es' ? 'es' : 'en';
}

export function useTranslation() {
  const lang = resolveLanguage();
  const dict = dictionaries[lang];

  function t(key: string, vars?: Record<string, string | number>): string {
    const parts = key.split('.');
    let value: unknown = dict;
    for (const part of parts) {
      value = (value as Record<string, unknown>)?.[part];
    }
    let result = typeof value === 'string' ? value : key;

    if (vars) {
      for (const [varKey, varValue] of Object.entries(vars)) {
        result = result.replace(`{${varKey}}`, String(varValue));
      }
    }

    return result;
  }

  return { t, lang };
}
