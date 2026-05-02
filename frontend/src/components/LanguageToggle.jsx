import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 hover:bg-[var(--color-accent)]/10 text-[10px] font-mono font-semibold text-[var(--color-accent)] transition-all hover:border-[var(--color-accent)]/60"
      title={`Switch to ${language === 'en' ? 'Bahasa Melayu' : 'English'}`}
    >
      <span className={language === 'en' ? 'font-bold' : 'opacity-60'}>{language === 'en' ? 'EN' : 'BM'}</span>
      <span className="opacity-40">/</span>
      <span className={language === 'bm' ? 'font-bold' : 'opacity-60'}>{language === 'en' ? 'BM' : 'EN'}</span>
    </button>
  );
}
