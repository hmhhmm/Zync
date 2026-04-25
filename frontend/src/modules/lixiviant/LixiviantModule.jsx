import { useEffect, useRef } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceArea } from 'recharts';
import { AlertTriangle, CheckCircle, Download, FlaskConical, Loader2, XCircle } from 'lucide-react';
import ModuleHero from '../../components/layout/ModuleHero';
import LogicExplorer from '../../components/trust/LogicExplorer';
import ReferencesPanel from '../../components/trust/ReferencesPanel';
import { parseSFILES } from '../../utils/sfiles';
import useLixiviant from '../../hooks/useLixiviant';

const CLASS_COLORS = { acid: '#f97316', alkali: '#38bdf8', organic: '#34d399' };
const COMPLIANCE_TONE = {
  pass: 'text-green-300 bg-green-500/10 border-green-500/40',
  fail: 'text-red-300 bg-red-500/10 border-red-500/40',
  insufficient_data: 'text-[var(--color-amber-warn)] bg-[rgba(245,158,11,0.14)] border-[rgba(245,158,11,0.4)]',
};
const COMPLIANCE_ICON = { pass: CheckCircle, fail: XCircle, insufficient_data: AlertTriangle };

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div className="panel-inset--soft p-3 min-w-[180px] text-xs space-y-1.5">
      <p className="text-white font-semibold">{data.name}</p>
      {[['Yield', `${data.yield}%`], ['ESG Risk', `${data.esgRisk}/10`], ['Temperature', `${data.temperature}°C`], ['Time', `${data.time}h`]].map(([k, v]) => (
        <div key={k} className="flex justify-between">
          <span className="text-white/50">{k}</span>
          <span className="font-mono text-white/90">{v}</span>
        </div>
      ))}
    </div>
  );
}

function SFILESPipeline({ notation }) {
  const steps = parseSFILES(notation);
  if (steps.length === 0) return null;
  return (
    <div className="sfiles-steps" role="list">
      {steps.map((s, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className={`sfiles-step ${s.type === 'feed' ? 'sfiles-step--feed' : s.type === 'flow' ? 'sfiles-step--flow' : 'sfiles-step--unit'}`} role="listitem" title={s.raw}>
            <strong>{s.name}</strong>
            {s.params.length > 0 && <span style={{ opacity: 0.7, fontSize: 10 }}>· {s.params.join(' · ')}</span>}
          </span>
          {i < steps.length - 1 && <span className="sfiles-arrow">→</span>}
        </span>
      ))}
    </div>
  );
}

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
        <span className="font-mono text-[10px] text-white/40 ml-2 flex-1">ILMU-GLM-5.1 · chemist-agent · lixiviant-selection</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px]" style={{ color: isStreaming ? '#28c840' : 'rgba(255,255,255,0.3)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: isStreaming ? '#28c840' : 'rgba(255,255,255,0.2)', boxShadow: isStreaming ? '0 0 6px #28c840' : 'none' }} />
          {isStreaming ? 'streaming' : reasoning ? 'done' : 'idle'}
        </span>
      </div>
      {isStreaming && <div className="progress-bar-wrap progress-bar-indeterminate" style={{ borderRadius: 0 }} />}
      <div className="terminal__body" ref={bodyRef}>
        {!reasoning && isStreaming && (
          <div className="space-y-2.5">
            <div className="skeleton h-3 w-3/4" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-5/6" />
          </div>
        )}
        {reasoning ? (
          <>
            <p className="font-mono text-[9.5px] tracking-widest uppercase text-white/30 mb-2">{'>'} agent 02 · chemistry reasoning</p>
            <pre className="terminal__text">{reasoning}{isStreaming && <span className="terminal__cursor" />}</pre>
          </>
        ) : !isStreaming && (
          <p className="font-mono text-[11.5px] text-white/30 text-center py-6">Pipeline output will stream here.</p>
        )}
      </div>
    </div>
  );
}

function IterationPanel({ iterations, iterationsRun, converged, isLoading }) {
  const TOTAL = 12;
  const pct = iterations.length > 0 ? Math.round((iterations.length / TOTAL) * 100) : 0;
  if (!isLoading && iterations.length === 0) return null;
  const bestYield = iterations.length > 0 ? Math.max(...iterations.map((it) => Number(it.yield_pct ?? 0))) : 0;

  return (
    <div className="panel-inset" id="iteration-panel">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <p className="muted-kicker">Agent 03 · Optimizer — Iteration Log</p>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${converged ? 'text-green-300 bg-green-500/10 border-green-500/40' : 'text-[var(--color-amber-warn)] bg-[rgba(245,158,11,0.14)] border-[rgba(245,158,11,0.4)]'}`}>
            {converged ? 'CONVERGED' : 'RUNNING'}
          </span>
        </div>
        <span className="font-mono text-[12px] text-white/55">{iterations.length}/{iterationsRun ?? TOTAL}</span>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-3 pb-1">
        <div className="score-bar-track">
          <div className="score-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="mono-meta text-[9px] mt-1.5 text-right">{pct}% complete</p>
      </div>

      <div className="px-5 pb-5 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {['#', 'pH range', 'Conc (M)', 'Temp (°C)', 'Time (hr)', 'Yield (%)', 'Th (ppm)', 'Status'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {iterations.map((it, i) => {
              const isBest = Number(it.yield_pct ?? 0) === bestYield && bestYield > 0;
              const statusColor = it.status === 'improved' ? 'text-green-300 border-green-500/40 bg-green-500/10'
                : it.status === 'converged' ? 'text-[var(--color-accent-bright)] border-[rgba(167,139,250,0.4)] bg-[rgba(124,58,237,0.18)]'
                : it.status === 'violation' ? 'text-red-300 border-red-500/40 bg-red-500/10'
                : 'text-white/45 border-white/15 bg-white/5';
              return (
                <tr key={i} className={isBest ? 'row--best' : ''} style={{ animation: `slide-in-up 0.3s ease ${i * 0.05}s both` }}>
                  <td>{it.iteration ?? i + 1}</td>
                  <td>{it.pH_range ?? '—'}</td>
                  <td>{it.concentration_M ?? '—'}</td>
                  <td>{it.temperature_C ?? '—'}</td>
                  <td>{it.contact_time_hrs ?? '—'}</td>
                  <td className={isBest ? 'font-bold text-[var(--color-accent-bright)]' : ''}>{it.yield_pct != null ? Number(it.yield_pct).toFixed(1) : '—'}</td>
                  <td>{it.thorium_ppm != null ? Number(it.thorium_ppm).toFixed(2) : '—'}</td>
                  <td><span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColor}`}>{it.status ?? '—'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComplianceCard({ compliance }) {
  if (!compliance) return null;
  const status = compliance.overall_status ?? 'insufficient_data';
  const StatusIcon = COMPLIANCE_ICON[status] ?? AlertTriangle;
  const tone = COMPLIANCE_TONE[status] ?? COMPLIANCE_TONE.insufficient_data;

  return (
    <div className="panel-inset--accent p-5 md:p-6 animate-slide-in-up" id="compliance-card">
      <div className="flex items-center justify-between mb-4">
        <p className="muted-kicker">Agent 04 · AELB + DOE + JMG Compliance</p>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border ${tone}`}>
          <StatusIcon size={11} />
          {status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'PARTIAL'}
        </span>
      </div>

      {compliance.checks?.length > 0 && (
        <div className="grid gap-2 mb-4">
          {compliance.checks.map((check, i) => {
            const checkTone = COMPLIANCE_TONE[check.status] ?? COMPLIANCE_TONE.insufficient_data;
            const CheckIcon = COMPLIANCE_ICON[check.status] ?? AlertTriangle;
            return (
              <div key={i} className="panel-inset--soft px-3 py-2.5 flex items-start gap-3">
                <CheckIcon size={13} className={`mt-0.5 shrink-0 ${checkTone.split(' ')[0]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/85 font-medium">{check.parameter}</p>
                  <p className="text-[10.5px] text-white/45 font-mono mt-0.5">
                    {check.proposed_value} · limit: {check.limit}
                    {check.regulation_cited && ` · ${check.regulation_cited}`}
                  </p>
                  {check.action_required && (
                    <p className="text-[11px] text-[var(--color-amber-warn)] mt-1 leading-relaxed">{check.action_required}</p>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${checkTone}`}>
                  {check.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {compliance.summary_en && (
        <p className="text-[12px] text-white/65 leading-relaxed">{compliance.summary_en}</p>
      )}
      {compliance.summary_bm && (
        <details className="mt-2">
          <summary className="mono-meta cursor-pointer text-white/45 hover:text-white/65 text-[10px]">Ringkasan BM</summary>
          <p className="mt-2 text-[12px] text-white/65 leading-relaxed">{compliance.summary_bm}</p>
        </details>
      )}
    </div>
  );
}

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
    <details className="panel-inset" id="report-panel">
      <summary className="flex items-center justify-between cursor-pointer px-5 py-4">
        <p className="muted-kicker">Agent 05 · Final Bilingual Report</p>
        <button onClick={(e) => { e.preventDefault(); handleExport(); }}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-white/45 hover:text-white/75 transition-colors">
          <Download size={12} /> Export .txt
        </button>
      </summary>
      <pre className="px-5 pb-5 text-[11.5px] font-mono leading-relaxed text-white/65 whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto">
        {reportText}
      </pre>
    </details>
  );
}

export default function LixiviantModule() {
  const {
    reagents, optimal, flowsheet, isLoading, error,
    iterations, iterationsRun, converged, compliance, report,
    streamingReasoning, fetchOptimization, generateFlowsheet,
  } = useLixiviant();

  useEffect(() => { fetchOptimization(); }, [fetchOptimization]);

  const chartData = reagents.map((r) => ({ ...r, x: r.yield, y: r.esgRisk }));

  return (
    <section className="panel panel-pad grid gap-6" id="lixiviant-module">
      <ModuleHero
        step="02"
        eyebrow="All 6 agents · autonomous optimization loop"
        title="Process Optimization"
        lead="Runs design iterations balancing yield against ESG risk, then exports execution-ready SFILES 2.0 for lab automation."
        inputs={['Clay / mineral type', 'REE concentration', 'ESG thresholds', 'Temperature budget']}
        outputs={['Recommended lixiviant', 'Pareto parameters', 'SFILES 2.0', 'Trade-off rationale']}
      />

      <div className="panel-inset--soft px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="mono-meta" style={{ fontSize: 9.5 }}>Objective</span>
        <span className="font-mono text-[12.5px] text-white/85">
          max J(x) = <span className="text-[var(--color-accent-bright)]">0.6·Yield(x)</span> −{' '}
          <span className="text-[#fbd38d]">0.4·ESG(x)</span>
        </span>
        <span className="mono-meta" style={{ fontSize: 9.5 }}>s.t. T ≤ 120 °C · Th ≤ 0.05 Bq g⁻¹ · residence ≤ 6 h</span>
      </div>

      {error && (
        <div className="panel-inset--soft px-4 py-3 text-xs font-mono text-[var(--color-amber-warn)] border-[rgba(245,158,11,0.4)] inline-flex items-center gap-2">
          {error}
        </div>
      )}

      <div className="kpi-row">
        <div className="kpi-cell kpi-cell--accent">
          <span className="kpi-cell__label">Design Speedup</span>
          <span className="kpi-cell__value">{optimal.design_speedup}%</span>
          <span className="kpi-cell__hint">vs manual baseline</span>
        </div>
        <div className="kpi-cell kpi-cell--accent">
          <span className="kpi-cell__label">Projected Yield</span>
          <span className="kpi-cell__value">{Math.round(optimal.extraction_yield)}%</span>
          <span className="kpi-cell__hint">Pareto-optimal</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-cell__label">ESG Risk</span>
          <span className="kpi-cell__value" style={{ color: '#fbd38d' }}>{optimal.esg_risk_score}/10</span>
          <span className="kpi-cell__hint">Radiological + effluent</span>
        </div>
        <div className="kpi-cell">
          <span className="kpi-cell__label">Iterations</span>
          <span className="kpi-cell__value">
            {iterationsRun != null ? iterationsRun : iterations.length > 0 ? iterations.length : isLoading ? '…' : '—'}
          </span>
          <span className="kpi-cell__hint">
            {converged === true ? 'converged' : converged === false ? 'max reached' : 'per loop'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-5 gap-5">
        {/* Chart */}
        <div className="panel-inset--accent p-5 md:p-6 2xl:col-span-3" id="tradeoff-matrix">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <p className="muted-kicker">Agent 03 · Optimizer + SQL RAG</p>
              <h3 className="text-[17px] font-semibold text-white mt-1.5">Yield vs ESG Trade-off</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] font-mono text-white/55">
              {Object.entries(CLASS_COLORS).map(([label, color]) => (
                <div key={label} className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 5 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.07)" />
              <ReferenceArea x1={75} x2={90} y1={0} y2={5} fill="#7c3aed" fillOpacity={0.07} stroke="rgba(167,139,250,0.25)" strokeDasharray="3 3" />
              <XAxis dataKey="x" type="number" domain={[30, 90]} tick={{ fontSize: 11, fill: 'rgba(205,213,255,0.5)' }} axisLine={{ stroke: 'rgba(255,255,255,0.12)' }} label={{ value: 'Extraction Yield (%)', position: 'bottom', offset: 8, style: { fontSize: 11, fill: 'rgba(205,213,255,0.5)' } }} />
              <YAxis dataKey="y" type="number" domain={[0, 10]} tick={{ fontSize: 11, fill: 'rgba(205,213,255,0.5)' }} axisLine={{ stroke: 'rgba(255,255,255,0.12)' }} label={{ value: 'ESG Risk', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'rgba(205,213,255,0.5)' } }} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Scatter data={chartData}>
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={CLASS_COLORS[entry.class]} r={entry.id === 'h2so4_naf' ? 10 : 7} stroke={entry.id === 'h2so4_naf' ? '#ddd6fe' : 'transparent'} strokeWidth={entry.id === 'h2so4_naf' ? 1.5 : 0} opacity={0.9} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <p className="mono-meta mt-1 text-center" style={{ fontSize: 10 }}>Shaded = Pareto-optimal · high yield · low ESG risk</p>
        </div>

        {/* Right panel */}
        <div className="2xl:col-span-2 grid gap-4">
          <div className="panel-inset--accent p-5 md:p-6" id="optimal-solution">
            <p className="muted-kicker">Recommended Route · Agent 02</p>
            {isLoading && !optimal.optimal_lixiviant ? (
              <div className="space-y-2 mt-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ) : (
              <>
                <h3 className="text-[18px] font-semibold text-white font-mono mt-2">{optimal.optimal_lixiviant}</h3>
                {optimal.pH_range && <p className="text-[11px] font-mono text-white/45 mt-1">pH {optimal.pH_range}</p>}
              </>
            )}

            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                ['Concentration', optimal.concentration_M != null ? `${optimal.concentration_M} M` : '—', ''],
                ['Temperature', optimal.temperature_c, '°C'],
                ['Contact time', optimal.residence_time_hr, 'hr'],
                ['S/L ratio', optimal.solid_liquid_ratio, ''],
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
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${optimal.thorium_risk === 'high' ? 'text-red-300 border-red-500/40 bg-red-500/10' : optimal.thorium_risk === 'medium' ? 'text-[var(--color-amber-warn)] border-amber-500/40 bg-amber-500/10' : 'text-green-300 border-green-500/40 bg-green-500/10'}`}>
                  Thorium risk: {optimal.thorium_risk.toUpperCase()}
                </span>
                {optimal.confidence && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border text-[var(--color-accent-bright)] border-[rgba(167,139,250,0.4)] bg-[rgba(124,58,237,0.18)]">
                    {optimal.confidence.toUpperCase()}
                  </span>
                )}
              </div>
            )}

            {optimal.alternative_option?.lixiviant && (
              <div className="mt-3 panel-inset--soft px-3 py-2.5">
                <p className="mono-meta text-[9.5px]">Alternative option</p>
                <p className="text-[12px] text-white/75 font-mono mt-1">{optimal.alternative_option.lixiviant}</p>
                {optimal.alternative_option.note && <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">{optimal.alternative_option.note}</p>}
              </div>
            )}
          </div>

          <ComplianceCard compliance={compliance} />

          <div className="panel-inset p-6" id="flowsheet-section">
            <div className="flex items-center justify-between mb-5">
              <p className="muted-kicker">SFILES 2.0 Delivery</p>
              <p className="mono-meta" style={{ fontSize: 9.5 }}>lab-automation ready</p>
            </div>
            <button onClick={generateFlowsheet} disabled={isLoading} className="btn btn-primary w-full">
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}
              Generate Process Notation
            </button>
            <p className="text-[10.5px] text-white/35 font-mono mt-4">POST /api/pipeline → Agent 02</p>
            {flowsheet && (
              <div className="mt-4 panel-inset--soft p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="mono-meta" style={{ fontSize: 9.5 }}>Parsed pipeline</span>
                  <span className="mono-meta" style={{ fontSize: 9.5 }}>{parseSFILES(flowsheet).length} steps</span>
                </div>
                <SFILESPipeline notation={flowsheet} />
                <details>
                  <summary className="mono-meta cursor-pointer text-white/45 hover:text-white/65" style={{ fontSize: 9.5 }}>View raw SFILES 2.0 string</summary>
                  <pre className="mt-2 text-[11px] font-mono leading-relaxed text-white/60 whitespace-pre-wrap break-all">{flowsheet}</pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agent 2 terminal */}
      <AgentTerminal reasoning={streamingReasoning} isStreaming={isLoading && !converged} />

      <IterationPanel iterations={iterations} iterationsRun={iterationsRun} converged={converged} isLoading={isLoading} />

      <ReportPanel report={report} />

      {optimal.chain_of_thought?.references?.length > 0 && (
        <ReferencesPanel references={optimal.chain_of_thought.references} title="Method citations" />
      )}
      {optimal.chain_of_thought?.reasoning_content && (
        <LogicExplorer chainOfThought={optimal.chain_of_thought} title="Pareto reasoning trace · Agent 02" />
      )}
    </section>
  );
}
