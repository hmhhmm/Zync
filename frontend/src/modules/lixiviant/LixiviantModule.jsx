import { useEffect, useRef, useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceArea,
} from 'recharts';
import { AlertTriangle, CheckCircle, Download, Loader2, Play, XCircle } from 'lucide-react';
import ModuleHero from '../../components/layout/ModuleHero';
import LogicExplorer from '../../components/trust/LogicExplorer';
import ReferencesPanel from '../../components/trust/ReferencesPanel';
import useLixiviant from '../../hooks/useLixiviant';

const CLASS_COLORS = { acid: '#f97316', alkali: '#38bdf8', organic: '#34d399' };

const COMPLIANCE_STYLE = {
  pass:              { color: '#86efac', background: 'rgba(34,197,94,0.1)',    border: '1px solid rgba(34,197,94,0.4)' },
  fail:              { color: '#fca5a5', background: 'rgba(239,68,68,0.1)',   border: '1px solid rgba(239,68,68,0.4)' },
  insufficient_data: { color: 'var(--color-amber-warn)', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)' },
};
const COMPLIANCE_ICON = { pass: CheckCircle, fail: XCircle, insufficient_data: AlertTriangle };

/* ─── Scatter tooltip ─── */
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="panel-inset--soft" style={{ padding: '12px 14px', minWidth: 180 }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</p>
      {[['Yield', `${d.yield}%`], ['ESG Risk', `${d.esgRisk}/10`], ['Temperature', `${d.temperature}°C`], ['Time', `${d.time}h`]].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k}</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-soft)' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Agent terminal ─── */
function AgentTerminal({ reasoning, isStreaming }) {
  const bodyRef = useRef(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [reasoning]);

  return (
    <div className="terminal">
      <div className="terminal__topbar">
        <span className="terminal__dot" style={{ background: '#ff5f57' }} />
        <span className="terminal__dot" style={{ background: '#febc2e' }} />
        <span className="terminal__dot" style={{ background: '#28c840' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginLeft: 8, flex: 1 }}>
          ILMU-GLM-5.1 · chemist-agent · lixiviant-selection
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: isStreaming ? '#28c840' : 'var(--text-faint)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isStreaming ? '#28c840' : 'var(--border-soft)',
            boxShadow: isStreaming ? '0 0 6px #28c840' : 'none',
          }} />
          {isStreaming ? 'streaming' : reasoning ? 'done' : 'idle'}
        </span>
      </div>

      {isStreaming && <div className="progress-bar-wrap progress-bar-indeterminate" style={{ borderRadius: 0 }} />}

      <div className="terminal__body" ref={bodyRef}>
        {!reasoning && isStreaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', fontSize: 11.5, padding: '10px 0' }}>
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            <span className="animate-pulse">[sys] waiting backend...</span>
          </div>
        )}
        {reasoning ? (
          <>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 8 }}>
              {'>'} agent 02 · chemistry reasoning
            </p>
            <pre className="terminal__text">
              {reasoning}
              {isStreaming && <span className="terminal__cursor" />}
            </pre>
          </>
        ) : !isStreaming && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-faint)', textAlign: 'center', padding: '24px 0' }}>
            Pipeline output will stream here.
          </p>
        )}
      </div>
    </div>
  );
}
/* ─── Iteration table ─── */
function IterationPanel({ iterations, iterationsRun, converged, isLoading }) {
  const TOTAL = 12;
  const pct = iterations.length > 0 ? Math.round((iterations.length / TOTAL) * 100) : 0;
  
  const scrollRef = useRef(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [iterations]);

  if (!isLoading && iterations.length === 0) return null;
  const bestYield = iterations.length > 0 ? Math.max(...iterations.map((it) => Number(it.yield_pct ?? 0))) : 0;

  const statusStyle = (status) => {
    if (status === 'improved')  return { color: '#86efac', background: 'rgba(34,197,94,0.1)',    border: '1px solid rgba(34,197,94,0.4)' };
    if (status === 'converged') return { color: 'var(--color-accent-bright)', background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(167,139,250,0.4)' };
    if (status === 'violation') return { color: '#fca5a5', background: 'rgba(239,68,68,0.1)',   border: '1px solid rgba(239,68,68,0.4)' };
    return { color: 'var(--text-muted)', background: 'var(--surface-soft)', border: '1px solid var(--border-soft)' };
  };

  return (
    <div className="panel-inset animate-slide-in-up" id="iteration-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-softer)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <p className="muted-kicker">Agent 03 · Optimizer — Iteration Log</p>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 6,
            ...(converged
              ? { color: '#86efac', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)' }
              : { color: 'var(--color-amber-warn)', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)' }),
          }}>
            {converged ? 'CONVERGED' : 'RUNNING'}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
          {iterations.length}/{iterationsRun ?? TOTAL}
        </span>
      </div>

      <div style={{ padding: '12px 20px 4px' }}>
        <div className="score-bar-track">
          <div className="score-bar-fill" style={{ width: `${pct}%`, transition: 'width 0.4s ease-out' }} />
        </div>
        <p className="muted-kicker" style={{ marginTop: 6, textAlign: 'right', fontSize: 9 }}>{pct}% complete</p>
      </div>

      <div 
        ref={scrollRef} 
        style={{ padding: '4px 20px 20px', overflowX: 'auto', maxHeight: '280px', overflowY: 'auto', scrollBehavior: 'smooth' }}
      >
        <table className="data-table">
          <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-panel, #000)', zIndex: 10 }}>
            <tr>
              {['#', 'pH range', 'Conc (M)', 'Temp (°C)', 'Time (hr)', 'Yield (%)', 'Th (ppm)', 'Status'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {iterations.length === 0 && isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <Loader2 size={13} className="animate-spin" style={{ display: 'inline-block', marginRight: 8, verticalAlign: 'middle', color: 'var(--text-soft)' }} />
                  Awaiting optimizer telemetry...
                </td>
              </tr>
            ) : (
              iterations.map((it, i) => {
                const isBest = Number(it.yield_pct ?? 0) === bestYield && bestYield > 0;
                const ss = statusStyle(it.status);
                return (
                  <tr key={i} className={isBest ? 'row--best' : ''} style={{ animation: `slide-in-up 0.25s ease-out forwards` }}>
                    <td>{it.iteration ?? i + 1}</td>
                    <td>{it.pH_range ?? '—'}</td>
                    <td>{it.concentration_M ?? '—'}</td>
                    <td>{it.temperature_C ?? '—'}</td>
                    <td>{it.contact_time_hrs ?? '—'}</td>
                    <td style={isBest ? { fontWeight: 700, color: 'var(--color-accent-bright)' } : {}}>
                      {it.yield_pct != null ? Number(it.yield_pct).toFixed(1) : '—'}
                    </td>
                    <td>{it.thorium_ppm != null ? Number(it.thorium_ppm).toFixed(2) : '—'}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 7px', borderRadius: 5, ...ss }}>
                        {it.status ?? '—'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Compliance card ─── */
function ComplianceCard({ compliance }) {
  if (!compliance) return null;
  const status = compliance.overall_status ?? 'insufficient_data';
  const StatusIcon = COMPLIANCE_ICON[status] ?? AlertTriangle;
  const tone = COMPLIANCE_STYLE[status] ?? COMPLIANCE_STYLE.insufficient_data;

  return (
    <div className="panel-inset--accent animate-slide-in-up" id="compliance-card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p className="muted-kicker">Agent 04 · AELB + DOE + JMG Compliance</p>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, padding: '4px 10px', borderRadius: 6, ...tone }}>
          <StatusIcon size={11} />
          {status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'PARTIAL'}
        </span>
      </div>

      {compliance.checks?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {compliance.checks.map((check, i) => {
            const ct = COMPLIANCE_STYLE[check.status] ?? COMPLIANCE_STYLE.insufficient_data;
            const CheckIcon = COMPLIANCE_ICON[check.status] ?? AlertTriangle;
            return (
              <div key={i} className="panel-inset--soft" style={{ padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <CheckIcon size={13} style={{ color: ct.color, flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{check.parameter}</p>
                  <p style={{ margin: '3px 0 0', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {check.proposed_value} · limit: {check.limit}
                    {check.regulation_cited && ` · ${check.regulation_cited}`}
                  </p>
                  {check.action_required && (
                    <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--color-amber-warn)', lineHeight: 1.55 }}>{check.action_required}</p>
                  )}
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 7px', borderRadius: 5, flexShrink: 0, whiteSpace: 'nowrap', ...ct }}>
                  {check.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {compliance.summary_en && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65 }}>{compliance.summary_en}</p>
      )}
      {compliance.summary_bm && (
        <details style={{ marginTop: 8 }}>
          <summary className="muted-kicker" style={{ cursor: 'pointer', fontSize: 10 }}>Ringkasan BM</summary>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65 }}>{compliance.summary_bm}</p>
        </details>
      )}
    </div>
  );
}

/* ─── Report panel ─── */
function ReportPanel({ report }) {
  if (!report) return null;
  const reportText = typeof report === 'string' ? report : JSON.stringify(report, null, 2);
  const handleExport = () => {
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `zync_report_${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <details className="panel-inset animate-slide-in-up" id="report-panel">
      <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '16px 20px' }}>
        <p className="muted-kicker">Agent 05 · Final Bilingual Report</p>
        <button
          onClick={(e) => { e.preventDefault(); handleExport(); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s ease' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-soft)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Download size={12} /> Export .txt
        </button>
      </summary>
      <pre style={{ padding: '0 20px 20px', fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.7, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, overflowY: 'auto' }}>
        {reportText}
      </pre>
    </details>
  );
}

/* ─── Main module ─── */
export default function LixiviantModule() {
  const {
    reagents, optimal, isLoading, error, isLive,
    iterations, iterationsRun, converged, compliance, report,
    streamingReasoning, fetchOptimization,
  } = useLixiviant();

  const [isApiSpinning, setIsApiSpinning] = useState(false);

  const handleRunSimulation = () => {
    setIsApiSpinning(true);
    // Fake the network delay before showing the actual graphs
    setTimeout(() => {
      setIsApiSpinning(false);
      fetchOptimization(); // The hook's internal logic will handle the rest!
    }, 15000); 
  };

  const chartData = reagents.map((r) => ({ ...r, x: r.yield, y: r.esgRisk }));

  return (
    <section className="panel panel-pad" id="lixiviant-module" style={{ display: 'grid', gap: 24 }}>

      <ModuleHero
        step="02"
        eyebrow="All 6 agents · autonomous optimization loop"
        title="Process Optimization"
        lead="Runs design iterations balancing yield against ESG risk."
        inputs={['Clay / mineral type', 'REE concentration', 'ESG thresholds', 'Temperature budget']}
        outputs={['Recommended lixiviant', 'Pareto parameters', 'Trade-off rationale']}
      />

      <div className="panel-inset--soft" style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 24px' }}>
        <span className="muted-kicker" style={{ fontSize: 9.5 }}>Objective</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-soft)' }}>
          max J(x) ={' '}
          <span style={{ color: 'var(--color-accent-bright)' }}>0.6·Yield(x)</span>
          {' − '}
          <span style={{ color: '#fbd38d' }}>0.4·ESG(x)</span>
        </span>
        <span className="muted-kicker" style={{ fontSize: 9.5 }}>s.t. T ≤ 120 °C · Th ≤ 0.05 Bq g⁻¹ · residence ≤ 6 h</span>
      </div>

      {error && (
        <div className="panel-inset--soft" style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-amber-warn)', border: '1px solid rgba(245,158,11,0.35)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {error}
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
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--text-primary)', transition: 'color 0.2s' }}>
            {isApiSpinning ? 'Initiating handshake with Agent Swarm...' : 'Optimization Loop Ready'}
          </p>
          <button 
            onClick={handleRunSimulation} 
            disabled={isApiSpinning}
            className="btn btn-primary" 
            style={{ padding: '8px 24px', minWidth: 200, justifyContent: 'center' }}
          >
            {isApiSpinning ? (
              <><Loader2 size={15} className="animate-spin" /> Connecting...</>
            ) : (
              <><Play size={15} /> Run Iteration Process</>
            )}
          </button>
        </div>
      )}

      {/* Active Dashboard State */}
      {(isLoading || isLive) && (
        <div className="animate-slide-in-up" style={{ display: 'grid', gap: 24 }}>
          
          {/* KPI row with staggered entrance */}
          <div className="kpi-row">
            <div 
              className="kpi-cell kpi-cell--accent" 
              style={{ animation: 'slide-in-up 0.4s ease-out 0.1s both' }}
            >
              <span className="kpi-cell__label">Design Speedup</span>
              <span className="kpi-cell__value">
                {isLoading && !isLive ? '...' : `${optimal.design_speedup}%`}
              </span>
              <span className="kpi-cell__hint">vs manual baseline</span>
            </div>

            <div 
              className="kpi-cell kpi-cell--accent" 
              style={{ animation: 'slide-in-up 0.4s ease-out 0.2s both' }}
            >
              <span className="kpi-cell__label">Projected Yield</span>
              <span className="kpi-cell__value">
                {isLoading && !isLive ? '...' : `${Math.round(optimal.extraction_yield)}%`}
              </span>
              <span className="kpi-cell__hint">Pareto-optimal</span>
            </div>

            <div 
              className="kpi-cell" 
              style={{ animation: 'slide-in-up 0.4s ease-out 0.3s both' }}
            >
              <span className="kpi-cell__label">ESG Risk</span>
              <span className="kpi-cell__value" style={{ color: '#fbd38d' }}>
                {isLoading && !isLive ? '...' : `${optimal.esg_risk_score}/10`}
              </span>
              <span className="kpi-cell__hint">Radiological + effluent</span>
            </div>

            <div 
              className="kpi-cell" 
              style={{ animation: 'slide-in-up 0.4s ease-out 0.4s both' }}
            >
              <span className="kpi-cell__label">Iterations</span>
              <span className="kpi-cell__value">
                {iterationsRun != null ? iterationsRun : iterations.length > 0 ? iterations.length : '…'}
              </span>
              <span className="kpi-cell__hint">
                {converged === true ? 'converged' : converged === false ? 'max reached' : 'live counter'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            <style>{`@media (min-width: 1400px) { #lixiviant-main-grid { grid-template-columns: 1fr 420px !important; } }`}</style>
            <div id="lixiviant-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>

              <div className="panel-inset--accent" id="tradeoff-matrix" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                  <div>
                    <p className="muted-kicker">Agent 03 · Optimizer + SQL RAG</p>
                    <h3 style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Yield vs ESG Trade-off</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {Object.entries(CLASS_COLORS).map(([label, color]) => (
                      <div key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 5 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.07)" />
                    <ReferenceArea x1={75} x2={90} y1={0} y2={5} fill="#7c3aed" fillOpacity={0.07} stroke="rgba(167,139,250,0.25)" strokeDasharray="3 3" />
                    <XAxis dataKey="x" type="number" domain={[30, 90]}
                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                      axisLine={{ stroke: 'var(--border-soft)' }}
                      label={{ value: 'Extraction Yield (%)', position: 'bottom', offset: 8, style: { fontSize: 11, fill: 'var(--text-muted)' } }}
                    />
                    <YAxis dataKey="y" type="number" domain={[0, 10]}
                      tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                      axisLine={{ stroke: 'var(--border-soft)' }}
                      label={{ value: 'ESG Risk', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--text-muted)' } }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Scatter data={chartData}>
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={CLASS_COLORS[entry.class]}
                          r={entry.id === 'h2so4_naf' ? 10 : 7}
                          stroke={entry.id === 'h2so4_naf' ? '#ddd6fe' : 'transparent'}
                          strokeWidth={entry.id === 'h2so4_naf' ? 1.5 : 0}
                          opacity={0.9}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <p className="muted-kicker" style={{ textAlign: 'center', marginTop: 4, fontSize: 10 }}>
                  Shaded = Pareto-optimal · high yield · low ESG risk
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="panel-inset--accent" id="optimal-solution" style={{ padding: '20px 24px' }}>
                  <p className="muted-kicker">Recommended Route · Agent 02</p>
                  {isLoading && !optimal.optimal_lixiviant ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                      <div className="skeleton" style={{ height: 20, width: '75%' }} />
                      <div className="skeleton" style={{ height: 12, width: '50%' }} />
                    </div>
                  ) : (
                    <>
                      <h3 style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {optimal.optimal_lixiviant}
                      </h3>
                      {optimal.pH_range && (
                        <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}>
                          pH {optimal.pH_range}
                        </p>
                      )}
                    </>
                  )}

                  <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                    {[
                      ['Concentration', optimal.concentration_M != null ? `${optimal.concentration_M} M` : '—', ''],
                      ['Temperature',   optimal.temperature_c,   '°C'],
                      ['Contact time',  optimal.residence_time_hr, 'hr'],
                      ['S/L ratio',     optimal.solid_liquid_ratio, ''],
                      ['Expected yield', optimal.extraction_yield != null ? `${Math.round(optimal.extraction_yield)}` : '—', '%'],
                    ].map(([label, value, unit]) => (
                      <div key={label} className="stat-block">
                        <span className="stat-block__label">{label}</span>
                        <span className="stat-block__figure">
                          <span className="stat-block__value">{value}</span>
                          {unit && <span className="stat-block__unit">{unit}</span>}
                        </span>
                      </div>
                    ))}
                  </div>

                  {optimal.thorium_risk && (
                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 8px', borderRadius: 5,
                        ...(optimal.thorium_risk === 'high'
                          ? { color: '#fca5a5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)' }
                          : optimal.thorium_risk === 'medium'
                          ? { color: 'var(--color-amber-warn)', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)' }
                          : { color: '#86efac', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)' }),
                      }}>
                        Thorium risk: {optimal.thorium_risk.toUpperCase()}
                      </span>
                      {optimal.confidence && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 8px', borderRadius: 5, color: 'var(--color-accent-bright)', background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(167,139,250,0.4)' }}>
                          {optimal.confidence.toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}

                  {optimal.alternative_option?.lixiviant && (
                    <div className="panel-inset--soft" style={{ marginTop: 12, padding: '10px 12px' }}>
                      <p className="muted-kicker" style={{ fontSize: 9.5 }}>Alternative option</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' }}>
                        {optimal.alternative_option.lixiviant}
                      </p>
                      {optimal.alternative_option.note && (
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                          {optimal.alternative_option.note}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <ComplianceCard compliance={compliance} />
              </div>
            </div>
          </div>

          <AgentTerminal reasoning={streamingReasoning} isStreaming={isLoading && !converged} />

          <IterationPanel iterations={iterations} iterationsRun={iterationsRun} converged={converged} isLoading={isLoading} />

          <ReportPanel report={report} />

          {optimal.chain_of_thought?.references?.length > 0 && (
            <ReferencesPanel references={optimal.chain_of_thought.references} title="Method citations" />
          )}
          {optimal.chain_of_thought?.reasoning_content && (
            <LogicExplorer chainOfThought={optimal.chain_of_thought} title="Pareto reasoning trace · Agent 02" />
          )}
        </div>
      )}
    </section>
  );
}