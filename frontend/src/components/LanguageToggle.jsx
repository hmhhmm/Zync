import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-[11px] font-mono font-semibold text-white/70 hover:text-white transition-all"
      title={`Switch to ${language === 'en' ? 'Bahasa Melayu' : 'English'}`}
    >
      <span>{language.toUpperCase()}</span>
      <span className="text-white/40">/</span>
      <span className="text-white/40">{language === 'en' ? 'BM' : 'EN'}</span>
    </button>
  );
}
