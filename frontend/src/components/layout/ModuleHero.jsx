export default function ModuleHero({
  step,
  eyebrow,
  title,
  lead,
  meta,
  inputs = [],
  outputs = [],
}) {
  const hasIO = inputs.length > 0 || outputs.length > 0;
  return (
    <header className="module-hero">
      <div className="module-hero__tags">
        {step && <span className="chip chip--accent">Module {step}</span>}
        {eyebrow && <span className="mono-meta">{eyebrow}</span>}
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
