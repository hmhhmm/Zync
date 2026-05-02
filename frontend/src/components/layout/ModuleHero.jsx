import { useLanguage } from '../../i18n/LanguageContext';
import { translations } from '../../i18n/translations';
import LanguageToggle from '../LanguageToggle';

export default function ModuleHero({
  step,
  eyebrow,
  title,
  lead,
  meta,
  inputs = [],
  outputs = [],
}) {
  const { language } = useLanguage();
  const t = translations[language];
  const hasIO = inputs.length > 0 || outputs.length > 0;

  return (
    <header className="module-hero">
      <div className="flex items-center justify-between">
        <div className="module-hero__tags">
          {step && <span className="chip chip--accent" style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>Module {step}</span>}
          {eyebrow && <span className="mono-meta">{eyebrow}</span>}
        </div>
        <LanguageToggle />
      </div>
      <h2 className="module-hero__title title-gradient">{title}</h2>
      {lead && <p className="module-hero__lead">{lead}</p>}
      {meta && <p className="mono-meta">{meta}</p>}

      {hasIO && (
        <div className="io-grid">
          {inputs.length > 0 && (
            <div>
              <span className="io-block__label">Operator Input</span>
              <div className="source-row">
                {inputs.map((label) => (
                  <span key={label} className="source-chip">{label}</span>
                ))}
              </div>
            </div>
          )}
          {outputs.length > 0 && (
            <div>
              <span className="io-block__label">Agent Delivery</span>
              <div className="source-row">
                {outputs.map((label) => (
                  <span key={label} className="source-chip source-chip--active">{label}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
