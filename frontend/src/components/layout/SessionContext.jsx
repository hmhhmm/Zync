import useBackendHealth from '../../hooks/useBackendHealth';

const FACTS = [
  { label: 'Session', value: 'ZX-47A21C', accent: true },
  { label: 'Model', value: 'GLM-5.1 MoE · 744B / 40B active' },
  { label: 'Context', value: '202,048 tok' },
  { label: 'Residency', value: 'MY-01 (Cyberjaya)' },
];

const BENCHES = [
  { value: '95.3%', label: 'AIME' },
  { value: '600+', label: 'iter/loop' },
  { value: '89%', label: 'time saved' },
];

export default function SessionContext() {
  const health = useBackendHealth();

  const badge = (() => {
    if (health.online === null) {
      return { label: 'Connecting…', tone: 'checking' };
    }
    if (health.online) {
      return { label: 'Backend live', tone: 'live' };
    }
    return { label: 'Backend offline · mock', tone: 'offline' };
  })();

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
        <div className="session-fact">
          <span className="session-fact__label">API</span>
          <span className={`session-status session-status--${badge.tone}`}>
            <span className="session-status__dot" aria-hidden />
            {badge.label}
          </span>
        </div>
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
