import { ArrowLeft, ArrowUpRight, Cpu, FlaskConical, MapPin } from 'lucide-react';

const NAV_ITEMS = [
  {
    id: 'diagnosis',
    label: 'Evidence Diagnosis',
    subtitle: 'Interpret samples, logs, operator notes',
    icon: FlaskConical,
    step: '01',
    agents: '3 agents',
  },
  {
    id: 'lixiviant',
    label: 'Process Optimization',
    subtitle: 'Full 7-agent optimization loop', // Updated from 6 to 7
    icon: Cpu,
    step: '02',
    agents: '7 agents', // Updated from 6 to 7
  },
  {
    id: 'zone-strategy',
    label: 'Zone Prioritization',
    subtitle: 'Rank zones by yield vs ESG risk',
    icon: MapPin,
    step: '03',
    agents: '3 agents · Agent 06', // Assuming 0-indexed agents (0-6 = 7 agents)
  },
];

export default function Sidebar({
  activeModule,
  onModuleChange,
  activeAgents = [],
  onReturnToLanding,
}) {
  return (
    <aside className="sidebar-sticky" id="sidebar">
      <div className="panel panel-pad-sm">
        <header
          className="flex items-center justify-between"
          style={{
            paddingBottom: '20px',
            marginBottom: '22px',
            borderBottom: '1px solid var(--border-softer)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p className="muted-kicker">Navigation</p>
            <h2 className="text-[16px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
              Decision Flow
            </h2>
          </div>
          {onReturnToLanding && (
            <button
              onClick={onReturnToLanding}
              className="icon-btn"
              aria-label="Return to mission page"
              title="Return to mission page"
            >
              <ArrowLeft size={13} />
            </button>
          )}
        </header>

        <nav className="grid gap-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onModuleChange(item.id)}
                className={`nav-item ${active ? 'nav-item--active' : ''}`}
                id={`nav-${item.id}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center"
                    style={{
                      border: '1px solid var(--border-soft)',
                      background: active ? 'rgba(124,58,237,0.12)' : 'var(--icon-btn-bg)',
                      color: active ? 'var(--color-accent)' : 'var(--text-muted)',
                      transition: 'background 0.18s ease, color 0.18s ease',
                    }}
                  >
                    <Icon size={14} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="mono-meta">Step {item.step}</span>
                      {active && (
                        <ArrowUpRight size={12} style={{ color: 'var(--color-accent)', opacity: 0.8 }} />
                      )}
                    </div>
                    <p
                      className="text-[13.5px] font-semibold leading-tight"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {item.label}
                    </p>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {item.subtitle}
                    </p>
                    <p className="mono-meta pt-0.5" style={{ fontSize: 9.5 }}>{item.agents}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        <section className="mt-7 panel-inset--soft" style={{ padding: '18px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
            <span className="muted-kicker" style={{ fontSize: 9.5 }}>Agents Online</span>
            <span className="mono-meta" style={{ fontSize: 10 }}>{activeAgents.length}/7</span> {/* Updated from /6 to /7 */}
          </div>
          <div className="flex gap-1.5" style={{ marginBottom: '18px' }}>
            {Array.from({ length: 7 }, (_, i) => {
              const on = activeAgents.includes(i);
              return (
                <span
                  key={i}
                  className="flex-1 h-1.5 rounded-full"
                  style={{
                    background: on
                      ? 'linear-gradient(90deg, #5769f7, #b45fee)'
                      : 'var(--border-soft)',
                    transition: 'background 0.3s ease',
                  }}
                />
              );
            })}
          </div>
          <p
            className="text-[10.5px] leading-relaxed"
            style={{
              paddingTop: '16px',
              borderTop: '1px solid var(--border-softer)',
              color: 'var(--text-muted)',
            }}
          >
            Operator retains final decision authority.
          </p>
        </section>
      </div>
    </aside>
  );
}