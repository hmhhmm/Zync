import { useEffect } from 'react';
import { AlertTriangle, BadgeCheck, CheckCircle, Clock, MapPin, Shield, TrendingUp, WifiOff } from 'lucide-react';
import ModuleHero from '../../components/layout/ModuleHero';
import LogicExplorer from '../../components/trust/LogicExplorer';
import ReferencesPanel from '../../components/trust/ReferencesPanel';
import useZoneStrategy from '../../hooks/useZoneStrategy';

const STATUS_MAP = {
  Approved: { icon: CheckCircle, tone: 'text-[var(--color-accent-bright)] bg-[rgba(124,58,237,0.22)] border-[rgba(167,139,250,0.45)]' },
  Conditional: { icon: AlertTriangle, tone: 'text-[var(--color-amber-warn)] bg-[rgba(245,158,11,0.14)] border-[rgba(245,158,11,0.4)]' },
  'Under Review': { icon: Clock, tone: 'text-[var(--color-amber-warn)] bg-[rgba(245,158,11,0.14)] border-[rgba(245,158,11,0.4)]' },
  Exploration: { icon: MapPin, tone: 'text-white/70 bg-white/5 border-white/15' },
  'Pre-feasibility': { icon: Clock, tone: 'text-white/75 bg-white/5 border-white/15' },
};

const SCORING_WEIGHTS = [
  { label: 'Mineral Grade', weight: 30 },
  { label: 'Estimated Reserves', weight: 25 },
  { label: 'Infrastructure', weight: 20 },
  { label: 'Regulatory Status', weight: 15 },
  { label: 'ESG Compliance', weight: 10 },
];

export default function ZoneStrategyModule() {
  const { zones, summaryBM, isLoading, error, fetchZones } = useZoneStrategy();

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const approvedCount = zones.filter((z) => z.regulatory === 'Approved').length;
  const totalReserves = zones.reduce((sum, z) => sum + Number(z.reserves_tonnes || 0), 0);

  return (
    <section className="panel panel-pad grid gap-6" id="zone-strategy-module">
      <ModuleHero
        step="03"
        eyebrow="Agents 00 · 01 · 03 · 04 · 05"
        title="Zone Prioritization"
        lead="GraphRAG traverses 100 years of geological studies; Agents 03 and 04 run in parallel to rank zones against yield and ESG thresholds."
        meta={isLoading ? 'Refreshing GET /api/zone-strategy…' : null}
        inputs={['Layer depth', 'Accessibility', 'Survey PDFs', 'IoT feeds']}
        outputs={['Ranked leaderboard', 'Sovereign BM brief', 'Regulatory flags', 'Rollout plan']}
      />

      {error && (
        <div className="panel-inset--soft px-4 py-3 text-xs font-mono text-[var(--color-amber-warn)] border-[rgba(245,158,11,0.4)] inline-flex items-center gap-2">
          <WifiOff size={13} />
          {error}
        </div>
      )}

      <div className="kpi-row">
        <div className="kpi-cell kpi-cell--accent">
          <span className="kpi-cell__label">Zones Ranked</span>
          <span className="kpi-cell__value">{zones.length}</span>
          <span className="kpi-cell__hint">National REE coverage</span>
        </div>
        <div className="kpi-cell kpi-cell--accent">
          <span className="kpi-cell__label">Approved Zones</span>
          <span className="kpi-cell__value">{approvedCount}</span>
          <span className="kpi-cell__hint">Pass Agent 04 · ESG gate</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-cell__label">Aggregate Reserves</span>
          <span className="kpi-cell__value">{(totalReserves / 1000).toFixed(0)}k<span className="text-sm text-white/55 ml-1">t</span></span>
          <span className="kpi-cell__hint">Estimated TREO</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-cell__label">Top Score</span>
          <span className="kpi-cell__value">{zones[0]?.score ?? '—'}<span className="text-sm text-white/55 ml-1">/100</span></span>
          <span className="kpi-cell__hint">{zones[0]?.name ?? 'Awaiting feed'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-5 gap-5">
        <div className="2xl:col-span-3 grid gap-3" id="zone-leaderboard">
          <div className="flex items-center justify-between">
            <p className="muted-kicker">Ranked leaderboard</p>
            <p className="mono-meta" style={{ fontSize: 10 }}>GET /api/zone-strategy</p>
          </div>
          {zones.map((zone) => {
            const status = STATUS_MAP[zone.regulatory] ?? STATUS_MAP.Exploration;
            const StatusIcon = status.icon;

            return (
              <article key={zone.id} className="panel-inset zone-card" id={`zone-${zone.id}`}>
                <span
                  className="zone-card__score-bar"
                  style={{ width: `${zone.score}%` }}
                  aria-hidden
                />

                <header className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-[rgba(124,58,237,0.2)] border border-[rgba(167,139,250,0.4)] text-[var(--color-accent-bright)] font-mono text-[13px] font-bold flex items-center justify-center">
                      #{zone.rank}
                    </div>
                    <h3 className="text-[16px] font-semibold text-white leading-tight truncate">{zone.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <TrendingUp size={14} className="text-[var(--color-accent)]" />
                    <span className="text-[22px] font-bold text-[var(--color-accent-bright)] font-mono leading-none">{zone.score}</span>
                    <span className="text-xs text-white/45 font-mono leading-none">/100</span>
                  </div>
                </header>

                <p className="text-[13px] text-white/65 leading-relaxed max-w-[68ch]">{zone.description}</p>

                <dl className="zone-meta zone-section">
                  <div>
                    <dt className="zone-meta__label">TREO grade</dt>
                    <dd className="zone-meta__value">{zone.treo_grade}</dd>
                  </div>
                  <div>
                    <dt className="zone-meta__label">Reserves</dt>
                    <dd className="zone-meta__value">{zone.reserves_tonnes.toLocaleString()} t</dd>
                  </div>
                  <div>
                    <dt className="zone-meta__label">Infrastructure</dt>
                    <dd className="zone-meta__value">{zone.infrastructure}</dd>
                  </div>
                  <div>
                    <dt className="zone-meta__label">Regulatory</dt>
                    <dd>
                      <span className={`rounded-md px-2 py-1 border inline-flex items-center gap-1.5 text-[11px] font-mono leading-none ${status.tone}`}>
                        <StatusIcon size={10} />
                        {zone.regulatory}
                      </span>
                    </dd>
                  </div>
                </dl>

                <div className="zone-section">
                  <span className="zone-meta__label">REE elements</span>
                  <div className="zone-elements__row">
                    {zone.ree_types.map((element) => (
                      <span key={element} className="zone-element-chip">{element}</span>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="2xl:col-span-2 grid gap-4">
          <div className="panel-inset--accent p-5" id="sovereign-summary">
            <div className="flex items-center gap-2">
              <Shield size={15} className="text-[var(--color-accent)]" />
              <p className="muted-kicker">Sovereign Summary · Agent 05</p>
            </div>
            <h3 className="text-[16px] font-semibold text-white mt-2">{summaryBM.title}</h3>

            <div className="mt-3 inline-flex items-center gap-2 chip chip--accent" style={{ fontSize: 10 }}>
              <BadgeCheck size={11} />
              Bahasa Malaysia Brief
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-white/75 whitespace-pre-line max-w-[52ch]">
              {summaryBM.content}
            </p>
          </div>

          <div className="panel-inset p-5" id="methodology-card">
            <p className="muted-kicker">Weighted Scoring</p>
            <p className="text-[11.5px] text-white/50 mt-1.5 leading-relaxed">
              S = Σ wᵢ · xᵢ · Agent 03 fits weights; Agent 04 enforces hard thresholds.
            </p>
            <div className="mt-4 grid gap-2">
              {SCORING_WEIGHTS.map((item) => (
                <div key={item.label} className="relative panel-inset--soft px-3 py-2.5 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 pointer-events-none"
                    style={{
                      width: `${item.weight * 2}%`,
                      background: 'linear-gradient(90deg, rgba(124,58,237,0.22), rgba(180,95,238,0.08))',
                    }}
                  />
                  <div className="relative flex items-center justify-between">
                    <span className="text-white/85 text-[13px]">{item.label}</span>
                    <span className="font-mono text-[var(--color-accent-bright)] font-semibold text-[13px]">{item.weight}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {summaryBM.chain_of_thought?.references?.length > 0 && (
        <ReferencesPanel references={summaryBM.chain_of_thought.references} title="Data provenance" />
      )}

      {summaryBM.chain_of_thought?.reasoning_content && (
        <LogicExplorer chainOfThought={summaryBM.chain_of_thought} title="Prioritization reasoning trace" />
      )}
    </section>
  );
}
