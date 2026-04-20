import { useEffect, useState } from 'react';
import { Clock3, TerminalSquare } from 'lucide-react';

export default function SovereigntyBar() {
  const [timeStr, setTimeStr] = useState(() => new Date().toLocaleTimeString('en-MY', { hour12: false }));

  useEffect(() => {
    const id = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('en-MY', { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="console-topbar" id="sovereignty-bar">
      <div className="inline-flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center text-white">
          <TerminalSquare size={16} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] tracking-[0.18em] font-semibold uppercase text-white/90">Zync AI Console</span>
          <span className="text-[10px] tracking-[0.14em] uppercase text-white/50">Sovereign Intelligence · MY-01</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3">
        <span className="chip">
          <span className="status-dot status-dot--live" />
          System Operational
        </span>
        <span className="chip">Data Residency · MY-01</span>
      </div>

      <div className="inline-flex items-center gap-2 mono-meta">
        <Clock3 size={13} />
        <span>{timeStr}</span>
      </div>
    </header>
  );
}
