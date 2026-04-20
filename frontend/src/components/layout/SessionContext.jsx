const FACTS = [
  { label: 'Session', value: 'ZX-47A21C', accent: true },
  { label: 'Model', value: 'GLM-5.1 MoE · 744B / 40B active' },
  { label: 'Context', value: '202,048 tok' },
  { label: 'Residency', value: 'MY-01 (Cyberjaya)' },
  { label: 'Last sync', value: 'UTC 02:15:44' },
];

const BENCHES = [
  { value: '95.3%', label: 'AIME' },
  { value: '600+', label: 'iter/loop' },
  { value: '89%', label: 'time saved' },
];

export default function SessionContext() {
  return (
    <div className="session-bar" role="note" aria-label="Session context">
      <div className="session-facts">
        {FACTS.map((f) => (
          <div key={f.label} className="session-fact">
            <span className="session-fact__label">{f.label}</span>
            <span
              className={`session-fact__value ${f.accent ? 'session-fact__value--accent' : ''}`}
            >
              {f.value}
            </span>
          </div>
        ))}
      </div>
      <div className="session-benchmarks" aria-label="Benchmark reference">
        {BENCHES.map((b) => (
          <div key={b.label} className="session-bench">
            <span className="session-bench__value">{b.value}</span>
            <span className="session-bench__label">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
