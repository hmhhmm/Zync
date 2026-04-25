import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, BadgeCheck, CheckCircle, Clock, Loader2, MapPin, Play, Shield, TrendingUp, WifiOff } from 'lucide-react';
import ModuleHero from '../../components/layout/ModuleHero';
import LogicExplorer from '../../components/trust/LogicExplorer';
import ReferencesPanel from '../../components/trust/ReferencesPanel';
import useZoneStrategy from '../../hooks/useZoneStrategy';

const STATUS_MAP = {
  Approved:       { icon: CheckCircle, tone: 'text-[var(--color-accent-bright)] bg-[rgba(124,58,237,0.22)] border-[rgba(167,139,250,0.45)]' },
  Conditional:    { icon: AlertTriangle, tone: 'text-[var(--color-amber-warn)] bg-[rgba(245,158,11,0.14)] border-[rgba(245,158,11,0.4)]' },
  'Under Review': { icon: Clock, tone: 'text-[var(--color-amber-warn)] bg-[rgba(245,158,11,0.14)] border-[rgba(245,158,11,0.4)]' },
  Exploration:    { icon: MapPin, tone: 'text-white/70 bg-white/5 border-white/15' },
  'Pre-feasibility': { icon: Clock, tone: 'text-white/75 bg-white/5 border-white/15' },
  DEFERRED:       { icon: AlertTriangle, tone: 'text-red-300 bg-red-500/10 border-red-500/40' },
};

const SCORING_WEIGHTS = [
  { label: 'Economic Value', weight: 30, color: '#a78bfa' },
  { label: 'Strategic (13MP HREE)', weight: 30, color: '#34d399' },
  { label: 'ESG Risk', weight: 25, color: '#fbd38d' },
  { label: 'Infrastructure', weight: 15, color: '#38bdf8' },
];

function AgentTerminal({ streamingReasoning, streamingSteps, agentStatus }) {
  const isActive = agentStatus[6] && agentStatus[6] !== 'done' && agentStatus[6] !== 'error';
  
  return (
    <div className="terminal" id="zone-reasoning-panel">
      <div className="terminal__topbar">
        <span className="terminal__dot" style={{ background: '#ff5f57' }} />
        <span className="terminal__dot" style={{ background: '#febc2e' }} />
        <span className="terminal__dot" style={{ background: '#28c840' }} />
        <span className="font-mono text-[10px] text-white/40 ml-2 flex-1">ILMU-GLM-5.1 · zone-prioritiser · agent-06</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px]" style={{ color: isActive ? '#28c840' : 'rgba(255,255,255,0.3)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? '#28c840' : 'rgba(255,255,255,0.2)', boxShadow: isActive ? '0 0 6px #28c840' : 'none' }} />
          {isActive ? 'streaming' : 'done'}
        </span>
      </div>
      {isActive && <div className="progress-bar-wrap progress-bar-indeterminate" style={{ borderRadius: 0 }} />}
      <div className="terminal__body">
        {isActive && !streamingSteps && (
           <div className="flex items-center gap-2.5 text-white/40 font-mono text-[11px] py-2">
            <Loader2 size={13} className="animate-spin text-[var(--color-accent)]" />
            <span className="animate-pulse">[sys] waiting for zone scorer telemetry...</span>
           </div>
        )}
        {streamingSteps && (
          <div className="mb-4">
            <p className="font-mono text-[9.5px] tracking-widest uppercase text-white/30 mb-2">{'>'} 5-step analysis</p>
            <pre className="terminal__text terminal__text--output">
              {streamingSteps}
              {isActive && !streamingReasoning && <span className="terminal__cursor" />}
            </pre>
          </div>
        )}
        {streamingReasoning && (
          <details open>
            <summary className="mono-meta cursor-pointer text-white/35 hover:text-white/55 text-[9.5px] mb-2">{'>'} internal thinking trace</summary>
            <pre className="terminal__text mt-2">
              {streamingReasoning}
              {isActive && <span className="terminal__cursor" />}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

function ScoreBreakdown({ scores }) {
  if (!scores) return null;
  const items = [
    { label: 'Econ', key: 'economic', color: '#a78bfa' },
    { label: 'Strategic', key: 'strategic', color: '#34d399' },
    { label: 'ESG', key: 'esg_risk', color: '#fbd38d' },
    { label: 'Infra', key: 'infra', color: '#38bdf8' },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 mt-3">
      {items.map(({ label, key, color }) => (
        <div key={key} className="panel-inset--soft px-2 py-2.5 text-center">
          <p className="text-[9.5px] text-white/40 font-mono">{label}</p>
          <p className="text-[14px] font-bold font-mono mt-0.5" style={{ color }}>{scores[key] ?? '—'}</p>
          <div className="score-bar-track mt-1.5">
            <div className="score-bar-fill" style={{ width: `${scores[key] ?? 0}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ZoneStrategyModule() {
  const {
    zones, summaryBM, validation, isValidating, isLoading, isLive,
    liveResult, streamingReasoning, streamingSteps, agentStatus, error,
    fetchZones, runValidationSuite,
  } = useZoneStrategy();

  const [isApiSpinning, setIsApiSpinning] = useState(false);

  const handleRunAnalysis = () => {
    setIsApiSpinning(true);
    setTimeout(() => {
      setIsApiSpinning(false);
      fetchZones();
    }, 7500); // 7.5s connection delay to match Lixiviant module
  };

  const approvedCount = zones.filter((z) => z.regulatory === 'Approved').length;
  const totalReserves = zones.reduce((sum, z) => sum + Number(z.reserves_tonnes || 0), 0);

  return (
    <section className="panel panel-pad grid gap-6" id="zone-strategy-module">
      <ModuleHero
        step="03"
        eyebrow="Agent 06 · Zone Prioritiser + GraphRAG"
        title="Zone Prioritization"
        lead="Agent 6 scores zones across Economic, ESG, Strategic (13MP HREE), and Infrastructure dimensions."
        meta={isValidating ? 'Running POST /api/validate…' : isLoading ? 'Streaming POST /api/zone…' : null}
        inputs={['Zone profiles', 'River proximity', 'Road access', 'HREE proportion']}
        outputs={['Ranked zones', 'Composite scores', 'BM brief', 'DOE compliance flags']}
      />

      {error && (
        <div className="panel-inset--soft px-4 py-3 text-xs font-mono text-[var(--color-amber-warn)] border-[rgba(245,158,11,0.4)] inline-flex items-center gap-2">
          <WifiOff size={13} /> {error}
        </div>
      )}

      {/* Idle / Connecting State */}
      {!isLive && !isLoading && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 14, padding: '54px 24px',
          borderRadius: 16, border: '1px dashed var(--border-soft)',
          background: 'rgba(255,255,255,0.01)',
          transition: 'all 0.3s ease'
        }}>
          <p className="text-[14.5px] text-white/80">
            {isApiSpinning ? 'Establishing connection with Agent 06...' : 'Zone Prioritizer Engine Ready'}
          </p>
          <button 
            onClick={handleRunAnalysis} 
            disabled={isApiSpinning}
            className="btn btn-primary" 
            style={{ padding: '8px 24px', minWidth: 200, justifyContent: 'center' }}
          >
            {isApiSpinning ? (
              <><Loader2 size={15} className="animate-spin" /> Connecting...</>
            ) : (
              <><Play size={15} /> Run Zone Analysis</>
            )}
          </button>
        </div>
      )}

      {/* Active Dashboard State */}
      {(isLoading || isLive) && (
        <div className="animate-slide-in-up grid gap-6">
          <div className="kpi-row">
            <div className="kpi-cell kpi-cell--accent" style={{ animation: 'slide-in-up 0.4s ease-out 0.1s both' }}>
              <span className="kpi-cell__label">Zones Assessed</span>
              <span className="kpi-cell__value">{isLoading && !isLive ? '...' : (liveResult?.zones_assessed ?? zones.length)}</span>
              <span className="kpi-cell__hint">{isLive ? 'Live from Agent 06' : 'Baseline dataset'}</span>
            </div>
            <div className="kpi-cell kpi-cell--accent" style={{ animation: 'slide-in-up 0.4s ease-out 0.2s both' }}>
              <span className="kpi-cell__label">Approved Zones</span>
              <span className="kpi-cell__value">{isLoading && !isLive ? '...' : approvedCount}</span>
              <span className="kpi-cell__hint">Pass DOE river threshold</span>
            </div>
            <div className="kpi-cell" style={{ animation: 'slide-in-up 0.4s ease-out 0.3s both' }}>
              <span className="kpi-cell__label">Aggregate Reserves</span>
              <span className="kpi-cell__value">
                {isLoading && !isLive ? '...' : (totalReserves > 0 ? `${(totalReserves / 1000).toFixed(0)}k` : '—')}
                {totalReserves > 0 && !isLoading && <span className="text-sm text-white/55 ml-1">t</span>}
              </span>
              <span className="kpi-cell__hint">Estimated TREO</span>
            </div>
            <div className="kpi-cell" style={{ animation: 'slide-in-up 0.4s ease-out 0.4s both' }}>
              <span className="kpi-cell__label">Top Score</span>
              <span className="kpi-cell__value">{isLoading && !isLive ? '...' : (zones[0]?.score ?? '—')}{!isLoading && <span className="text-sm text-white/55 ml-1">/100</span>}</span>
              <span className="kpi-cell__hint">{isLoading && !isLive ? 'Ranking...' : (zones[0]?.name ?? 'Awaiting analysis')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-5 gap-6">
            <div className="2xl:col-span-3 grid gap-4" id="zone-leaderboard">
              <p className="muted-kicker">{isLive ? 'Live ranked results · Agent 06' : 'Awaiting ranking...'}</p>

              {isLoading && zones.length === 0 && (
                <div className="grid gap-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="panel-inset p-6">
                      <div className="skeleton h-4 w-1/2 mb-3" />
                      <div className="skeleton h-3 w-full mb-2" />
                      <div className="skeleton h-3 w-3/4" />
                    </div>
                  ))}
                </div>
              )}

              {zones.map((zone, idx) => {
                const status = STATUS_MAP[zone.regulatory] ?? STATUS_MAP.Exploration;
                const StatusIcon = status.icon;
                return (
                  <article
                    key={zone.id}
                    className="panel-inset zone-card"
                    id={`zone-${zone.id}`}
                    style={{ animation: `slide-in-up 0.3s ease-out forwards` }}
                  >
                    <span className="zone-card__score-bar" style={{ width: `${zone.score}%`, transition: 'width 1s ease-in-out' }} aria-hidden />

                    <header className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 shrink-0 rounded-lg bg-[rgba(124,58,237,0.2)] border border-[rgba(167,139,250,0.4)] text-[var(--color-accent-bright)] font-mono text-[13px] font-bold flex items-center justify-center">
                          #{zone.rank}
                        </div>
                        <div>
                          <h3 className="text-[16px] font-semibold text-white leading-tight truncate">{zone.name}</h3>
                          {zone.confidence && <span className="text-[10px] font-mono text-white/40">{zone.confidence} confidence</span>}
                        </div>
                      </div>
                      <div className="flex items-end flex-col gap-1 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={14} className="text-[var(--color-accent)]" />
                          <span className="text-[24px] font-bold text-[var(--color-accent-bright)] font-mono leading-none">{zone.score}</span>
                          <span className="text-xs text-white/40 font-mono">/100</span>
                        </div>
                        <div className="score-bar-track w-20">
                          <div className="score-bar-fill" style={{ width: `${zone.score}%` }} />
                        </div>
                      </div>
                    </header>

                    <p className="text-[13px] text-white/60 leading-relaxed max-w-[68ch]">{zone.description}</p>
                    {zone.scores && <ScoreBreakdown scores={zone.scores} />}

                    <dl className="zone-meta zone-section">
                      <div><dt className="zone-meta__label">TREO grade</dt><dd className="zone-meta__value">{zone.treo_grade}</dd></div>
                      {zone.reserves_tonnes > 0 && <div><dt className="zone-meta__label">Reserves</dt><dd className="zone-meta__value">{zone.reserves_tonnes.toLocaleString()} t</dd></div>}
                      <div><dt className="zone-meta__label">Infrastructure</dt><dd className="zone-meta__value">{zone.infrastructure}</dd></div>
                      <div>
                        <dt className="zone-meta__label">Regulatory</dt>
                        <dd>
                          <span className={`rounded-md px-2 py-1 border inline-flex items-center gap-1.5 text-[11px] font-mono leading-none ${status.tone}`}>
                            <StatusIcon size={10} /> {zone.regulatory}
                          </span>
                        </dd>
                      </div>
                    </dl>

                    <div className="zone-section">
                      <span className="zone-meta__label">REE elements</span>
                      <div className="zone-elements__row">
                        {zone.ree_types.map((el) => <span key={el} className="zone-element-chip">{el}</span>)}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="2xl:col-span-2 grid gap-5">
              <AgentTerminal streamingReasoning={streamingReasoning} streamingSteps={streamingSteps} agentStatus={agentStatus} />

              <div className="panel-inset--accent" id="sovereign-summary" style={{ padding: '24px' }}>
                <div className="flex items-center gap-2">
                  <Shield size={15} className="text-[var(--color-accent)]" />
                  <p className="muted-kicker">Sovereign Summary · Agent 05</p>
                </div>
                <h3 className="text-[16px] font-semibold text-white mt-2.5">{summaryBM.title}</h3>
                {liveResult?.recommended?.confidence && (
                  <div className="inline-flex items-center gap-2 chip chip--accent mt-2.5" style={{ fontSize: 10 }}>
                    <BadgeCheck size={11} /> Confidence: {liveResult.recommended.confidence}
                  </div>
                )}
                <p className="text-[13px] text-white/75 whitespace-pre-line max-w-[52ch] mt-4" style={{ lineHeight: 1.75 }}>
                  {summaryBM.content}
                </p>
              </div>

              <div className="panel-inset p-6" id="methodology-card">
                <p className="muted-kicker mb-2">Weighted Scoring · Agent 06</p>
                <div className="grid gap-2.5">
                  {SCORING_WEIGHTS.map((item) => (
                    <div key={item.label} className="panel-inset--soft px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-white/85 text-[13px]">{item.label}</span>
                        <span className="font-mono font-semibold text-[13px]" style={{ color: item.color }}>{item.weight}%</span>
                      </div>
                      <div className="score-bar-track">
                        <div className="score-bar-fill" style={{ width: `${item.weight * 2}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel-inset p-6" id="validation-card">
                <div className="flex items-center justify-between mb-4">
                  <p className="muted-kicker">Known-Answer Validation</p>
                </div>
                <button
                  onClick={() => runValidationSuite()}
                  disabled={isValidating}
                  className="btn btn-primary w-full"
                  id="run-validation-btn"
                >
                  {isValidating ? <><Loader2 size={13} className="animate-spin" /> Running…</> : 'Run validation suite'}
                </button>

                {validation && (
                  <div className="mt-5 pt-4 border-t border-white/6 grid gap-3 animate-slide-in-up">
                    <div className="flex items-center justify-between font-mono text-[12px]">
                      <span className="text-white/60">Result</span>
                      <span className="text-[var(--color-accent-bright)]">
                        {validation.passed}/{validation.total} pass
                      </span>
                    </div>
                    {validation.results?.map((r) => (
                      <div key={r.test_id} className="panel-inset--soft flex items-center justify-between gap-3 px-3 py-2.5">
                        <span className="text-[12px] text-white/75 truncate">{r.scenario}</span>
                        <span className={`font-mono text-[10px] px-2 py-0.5 rounded-md border shrink-0 ${
                          r.status === 'pass' ? 'border-green-500/40 text-green-300 bg-green-500/10' : 'border-amber-500/40 text-amber-200 bg-amber-500/10'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}