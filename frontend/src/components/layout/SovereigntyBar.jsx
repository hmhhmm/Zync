import { useEffect, useState } from 'react';
import { Clock3, TerminalSquare } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import useBackendHealth from '../../hooks/useBackendHealth';

export default function SovereigntyBar() {
  const [timeStr, setTimeStr] = useState(() => new Date().toLocaleTimeString('en-MY', { hour12: false }));
  const { version } = useBackendHealth();

  useEffect(() => {
    const id = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('en-MY', { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="console-topbar" id="sovereignty-bar">
      <div className="inline-flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            border: '1px solid var(--border-soft)',
            background: 'var(--icon-btn-bg)',
            color: 'var(--text-primary)',
          }}
        >
          <TerminalSquare size={15} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] tracking-[0.18em] font-semibold uppercase" style={{ color: 'var(--text-primary)' }}>
            Zync AI Console
          </span>
          <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: 'var(--text-muted)' }}>
            Sovereign Intelligence · MY-01{version ? ` · v${version}` : ''}
          </span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3">
        <span className="chip">
          <span className="status-dot status-dot--live" />
          System Operational
        </span>
        <span className="chip">Data Residency · MY-01</span>
      </div>

      <div className="inline-flex items-center gap-3">
        <div className="mono-meta inline-flex items-center gap-2">
          <Clock3 size={12} />
          <span>{timeStr}</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
