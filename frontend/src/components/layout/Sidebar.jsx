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
    subtitle: 'Full 6-agent optimization loop',
    icon: Cpu,
    step: '02',
    agents: '6 agents',
  },
  {
    id: 'zone-strategy',
    label: 'Zone Prioritization',
    subtitle: 'Rank zones by yield vs ESG risk',
    icon: MapPin,
    step: '03',
    agents: '5 agents',
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
          className="flex items-center justify-between border-b border-white/10"
          style={{ paddingBottom: '22px', marginBottom: '24px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p className="muted-kicker">Navigation</p>
            <h2 className="text-[17px] font-semibold text-white leading-tight">Decision Flow</h2>
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

        <nav className="grid gap-3.5">
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
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 shrink-0 rounded-xl border flex items-center justify-center ${
                      active
                        ? 'border-[rgba(221,214,254,0.45)] bg-white/10 text-white'
                        : 'border-white/10 bg-white/5 text-white/65'
                    }`}
                  >
                    <Icon size={14} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="mono-meta">Step {item.step}</span>
                      {active && <ArrowUpRight size={13} className="text-white/80" />}
                    </div>
                    <p className={`text-[14px] font-semibold leading-tight ${active ? 'text-white' : 'text-white/85'}`}>
                      {item.label}
                    </p>
                    <p className="text-[11.5px] text-white/55 leading-relaxed">
                      {item.subtitle}
                    </p>
                    <p className="mono-meta pt-1" style={{ fontSize: 9.5 }}>{item.agents}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        <section className="mt-8 panel-inset--soft" style={{ padding: '20px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '18px' }}>
            <span className="muted-kicker" style={{ fontSize: 9.5 }}>Agents Online</span>
            <span className="mono-meta" style={{ fontSize: 10 }}>{activeAgents.length}/6</span>
          </div>
          <div className="flex gap-1.5" style={{ marginBottom: '22px' }}>
            {Array.from({ length: 6 }, (_, i) => {
              const on = activeAgents.includes(i);
              return (
                <span
                  key={i}
                  className="flex-1 h-1.5 rounded-full"
                  style={{
                    background: on
                      ? 'linear-gradient(90deg, #5769f7, #b45fee)'
                      : 'rgba(208, 214, 255, 0.12)',
                  }}
                />
              );
            })}
          </div>
          <p
            className="text-[10.5px] text-white/45 leading-relaxed"
            style={{ paddingTop: '18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            Operator retains final decision authority.
          </p>
        </section>
      </div>
    </aside>
  );
}
