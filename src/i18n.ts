import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'tr', 'de', 'fr', 'ar', 'zh'],
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      // Served from CRA public/ as /locales/{lng}/{ns}.json
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
  });

// Keep HTML language and direction in sync with i18n language
const RTL_LANGS = ['ar', 'fa', 'he', 'ur'];
const updateHtmlDir = (lng?: string) => {
  if (typeof document === 'undefined') return;
  const lang = lng || i18n.language || 'en';
  const dir = RTL_LANGS.some((code) => lang.startsWith(code)) ? 'rtl' : 'ltr';
  const html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', dir);
};

i18n.on('initialized', () => updateHtmlDir(i18n.language));
i18n.on('languageChanged', (lng) => updateHtmlDir(lng));

export default i18n;
