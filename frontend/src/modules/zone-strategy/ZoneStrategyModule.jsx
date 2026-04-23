import { useEffect } from 'react';
import { AlertTriangle, BadgeCheck, Brain, CheckCircle, Clock, Loader2, MapPin, Shield, TrendingUp, WifiOff } from 'lucide-react';
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
  DEFERRED: { icon: AlertTriangle, tone: 'text-red-300 bg-red-500/10 border-red-500/40' },
};

const SCORING_WEIGHTS = [
  { label: 'Economic Value', weight: 30 },
  { label: 'Strategic (13MP HREE)', weight: 30 },
  { label: 'ESG Risk', weight: 25 },
  { label: 'Infrastructure', weight: 15 },
];

function LiveReasoningPanel({ streamingReasoning, streamingSteps, agentStatus }) {
  const isActive = agentStatus[6] && agentStatus[6] !== 'done' && agentStatus[6] !== 'error';
  if (!streamingReasoning && !streamingSteps) return null;

  return (
    <div className="panel-inset--accent" id="zone-reasoning-panel" style={{ padding: '24px' }}>
      <div className="flex items-center gap-2 mb-4">
        <Brain size={15} className="text-[var(--color-accent)]" />
        <p className="muted-kicker">Agent 06 · Live Reasoning Trace</p>
        {isActive && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[var(--color-amber-warn)]">
            <Loader2 size={10} className="animate-spin" />
            thinking…
          </span>
        )}
      </div>

      {streamingSteps && (
        <div className="mb-4">
          <p className="mono-meta text-[9.5px] mb-2">5-Step Analysis</p>
          <pre className="text-[11.5px] font-mono leading-relaxed text-white/75 whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
            {streamingSteps}
          </pre>
        </div>
      )}

      {streamingReasoning && (
        <details>
          <summary className="mono-meta cursor-pointer text-white/55 hover:text-white/75 text-[9.5px]">
            Internal thinking trace
          </summary>
          <pre className="mt-2 text-[11px] font-mono leading-relaxed text-white/55 whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
            {streamingReasoning}
          </pre>
        </details>
      )}
    </div>
  );
}

function LiveScoreBreakdown({ scores }) {
  if (!scores) return null;
  const items = [
    { label: 'Economic', key: 'economic', color: '#a78bfa' },
    { label: 'Strategic', key: 'strategic', color: '#34d399' },
    { label: 'ESG Risk', key: 'esg_risk', color: '#fbd38d' },
    { label: 'Infra', key: 'infra', color: '#38bdf8' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {items.map(({ label, key, color }) => (
        <div key={key} className="panel-inset--soft px-3 py-2">
          <p className="text-[10px] text-white/45 font-mono">{label}</p>
          <p className="text-[15px] font-bold font-mono" style={{ color }}>{scores[key] ?? '—'}</p>
        </div>
      ))}
    </div>
  );
}

export default function ZoneStrategyModule() {
  const {
    zones,
    summaryBM,
    validation,
    isValidating,
    isLoading,
    isLive,
    liveResult,
    streamingReasoning,
    streamingSteps,
    agentStatus,
    error,
    fetchZones,
    runValidationSuite,
  } = useZoneStrategy();

  useEffect(() => {
    // Do not auto-fetch on mount — require explicit user action to avoid
    // burning API quota when the backend key is down.
  }, []);

  const approvedCount = zones.filter((z) => z.regulatory === 'Approved').length;
  const totalReserves = zones.reduce((sum, z) => sum + Number(z.reserves_tonnes || 0), 0);

  return (
    <section className="panel panel-pad grid gap-6" id="zone-strategy-module">
      <ModuleHero
        step="03"
        eyebrow="Agent 06 · Zone Prioritiser + GraphRAG"
        title="Zone Prioritization"
        lead="Agent 6 scores zones across Economic, ESG, Strategic (13MP HREE), and Infrastructure dimensions — streaming live reasoning as it works."
        meta={isValidating ? 'Running POST /api/validate…' : isLoading ? 'Streaming POST /api/zone…' : null}
        inputs={['Zone profiles', 'River proximity', 'Road access', 'HREE proportion']}
        outputs={['Ranked zones', 'Composite scores', 'BM brief', 'DOE compliance flags']}
      />

      {error && (
        <div className="panel-inset--soft px-4 py-3 text-xs font-mono text-[var(--color-amber-warn)] border-[rgba(245,158,11,0.4)] inline-flex items-center gap-2">
          <WifiOff size={13} />
          {error}
        </div>
      )}

      <div className="kpi-row">
        <div className="kpi-cell kpi-cell--accent">
          <span className="kpi-cell__label">Zones Assessed</span>
          <span className="kpi-cell__value">{liveResult?.zones_assessed ?? zones.length}</span>
          <span className="kpi-cell__hint">{isLive ? 'Live from Agent 06' : 'Baseline dataset'}</span>
        </div>
        <div className="kpi-cell kpi-cell--accent">
          <span className="kpi-cell__label">Approved Zones</span>
          <span className="kpi-cell__value">{approvedCount}</span>
          <span className="kpi-cell__hint">Pass DOE river threshold</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-cell__label">Aggregate Reserves</span>
          <span className="kpi-cell__value">
            {totalReserves > 0 ? `${(totalReserves / 1000).toFixed(0)}k` : '—'}
            {totalReserves > 0 && <span className="text-sm text-white/55 ml-1">t</span>}
          </span>
          <span className="kpi-cell__hint">Estimated TREO</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-cell__label">Top Score</span>
          <span className="kpi-cell__value">{zones[0]?.score ?? '—'}<span className="text-sm text-white/55 ml-1">/100</span></span>
          <span className="kpi-cell__hint">{zones[0]?.name ?? 'Awaiting analysis'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-5" style={{ gap: '24px' }}>
        <div className="2xl:col-span-3 grid" style={{ gap: '16px' }} id="zone-leaderboard">
          <div className="flex items-center justify-between">
            <p className="muted-kicker">{isLive ? 'Live ranked results · Agent 06' : 'Baseline leaderboard'}</p>
            <button
              onClick={() => fetchZones()}
              disabled={isLoading}
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: 11 }}
              id="run-zone-analysis-btn"
            >
              {isLoading
                ? <><Loader2 size={12} className="animate-spin" /> Analysing…</>
                : 'Run Zone Analysis'}
            </button>
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
                    <div>
                      <h3 className="text-[16px] font-semibold text-white leading-tight truncate">{zone.name}</h3>
                      {zone.confidence && (
                        <span className="text-[10px] font-mono text-white/45">{zone.confidence} confidence</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <TrendingUp size={14} className="text-[var(--color-accent)]" />
                    <span className="text-[22px] font-bold text-[var(--color-accent-bright)] font-mono leading-none">{zone.score}</span>
                    <span className="text-xs text-white/45 font-mono leading-none">/100</span>
                  </div>
                </header>

                <p className="text-[13px] text-white/65 leading-relaxed max-w-[68ch]">{zone.description}</p>

                {zone.scores && <LiveScoreBreakdown scores={zone.scores} />}

                <dl className="zone-meta zone-section">
                  <div>
                    <dt className="zone-meta__label">TREO grade</dt>
                    <dd className="zone-meta__value">{zone.treo_grade}</dd>
                  </div>
                  {zone.reserves_tonnes > 0 && (
                    <div>
                      <dt className="zone-meta__label">Reserves</dt>
                      <dd className="zone-meta__value">{zone.reserves_tonnes.toLocaleString()} t</dd>
                    </div>
                  )}
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

                {zone.reasoning_bm && (
                  <details className="mt-2">
                    <summary className="mono-meta cursor-pointer text-white/45 hover:text-white/65 text-[9.5px]">
                      Ulasan BM
                    </summary>
                    <p className="mt-1.5 text-[12px] text-white/65 leading-relaxed">{zone.reasoning_bm}</p>
                  </details>
                )}
              </article>
            );
          })}
        </div>

        <div className="2xl:col-span-2 grid" style={{ gap: '20px' }}>
          <LiveReasoningPanel
            streamingReasoning={streamingReasoning}
            streamingSteps={streamingSteps}
            agentStatus={agentStatus}
          />

          <div className="panel-inset--accent" id="sovereign-summary" style={{ padding: '24px' }}>
            <div className="flex items-center gap-2">
              <Shield size={15} className="text-[var(--color-accent)]" />
              <p className="muted-kicker">Sovereign Summary · Agent 05</p>
            </div>
            <h3 className="text-[16px] font-semibold text-white" style={{ marginTop: '10px' }}>
              {summaryBM.title}
            </h3>

            {liveResult?.recommended?.confidence && (
              <div className="inline-flex items-center gap-2 chip chip--accent" style={{ fontSize: 10, marginTop: '10px' }}>
                <BadgeCheck size={11} />
                Confidence: {liveResult.recommended.confidence}
              </div>
            )}

            <div
              className="inline-flex items-center gap-2 chip chip--accent"
              style={{ fontSize: 10, marginTop: '14px' }}
            >
              <BadgeCheck size={11} />
              Bahasa Malaysia Brief
            </div>

            <p
              className="text-[13px] text-white/80 whitespace-pre-line max-w-[52ch]"
              style={{ marginTop: '18px', lineHeight: 1.75 }}
            >
              {summaryBM.content}
            </p>
          </div>

          <div className="panel-inset" id="methodology-card" style={{ padding: '24px' }}>
            <p className="muted-kicker">Weighted Scoring · Agent 06</p>
            <p
              className="text-[11.5px] text-white/55 leading-relaxed"
              style={{ marginTop: '8px' }}
            >
              S = Σ wᵢ · xᵢ · Hard rules: DOE 500m river threshold, 13MP HREE priority.
            </p>
            <div className="grid" style={{ marginTop: '18px', gap: '10px' }}>
              {SCORING_WEIGHTS.map((item) => (
                <div
                  key={item.label}
                  className="relative panel-inset--soft overflow-hidden"
                  style={{ padding: '12px 16px' }}
                >
                  <div
                    className="absolute inset-y-0 left-0 pointer-events-none"
                    style={{
                      width: `${item.weight * 2}%`,
                      background:
                        'linear-gradient(90deg, rgba(124,58,237,0.22), rgba(180,95,238,0.05))',
                    }}
                  />
                  <div className="relative flex items-center justify-between">
                    <span className="text-white/90 text-[13px]">{item.label}</span>
                    <span className="font-mono text-[var(--color-accent-bright)] font-semibold text-[13px]">
                      {item.weight}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-inset" id="validation-card" style={{ padding: '24px' }}>
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: '16px' }}
            >
              <p className="muted-kicker">Known-Answer Validation</p>
              <p className="mono-meta" style={{ fontSize: 9.5 }}>POST /api/validate</p>
            </div>
            <p
              className="text-[11.5px] text-white/60 leading-relaxed"
              style={{ marginBottom: '22px' }}
            >
              Five published benchmarks (DOSM, AELB, MOSTI) run against the live backend to prove
              the recommendation engine is grounded — not hallucinated.
            </p>
            <button
              onClick={() => runValidationSuite()}
              disabled={isValidating}
              className="btn btn-primary w-full"
              id="run-validation-btn"
            >
              {isValidating ? 'Running…' : 'Run validation suite'}
            </button>

            {validation && (
              <div
                className="grid text-[12px]"
                style={{
                  marginTop: '22px',
                  paddingTop: '18px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  gap: '12px',
                }}
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="text-white/70">Result</span>
                  <span className="text-[var(--color-accent-bright)]">
                    {validation.passed}/{validation.total} pass · {validation.edge_cases} edge · {validation.failed} fail
                  </span>
                </div>
                <div className="grid" style={{ gap: '8px' }}>
                  {validation.results?.map((r) => (
                    <div
                      key={r.test_id}
                      className="panel-inset--soft flex items-center justify-between gap-3"
                      style={{ padding: '10px 14px' }}
                    >
                      <span className="text-white/80 truncate">{r.scenario}</span>
                      <span
                        className={`font-mono text-[11px] px-2 py-0.5 rounded-md border ${
                          r.status === 'pass'
                            ? 'border-green-500/40 text-green-300 bg-green-500/10'
                            : r.status === 'edge_case'
                              ? 'border-indigo-400/40 text-indigo-200 bg-indigo-500/10'
                              : 'border-amber-500/40 text-amber-200 bg-amber-500/10'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
