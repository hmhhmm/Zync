import { useCallback, useRef, useState } from 'react';
import { CheckCircle, FileText, Loader2, Play, ShieldAlert, Upload } from 'lucide-react';
import ModuleHero from '../../components/layout/ModuleHero';
import useDiagnosis from '../../hooks/useDiagnosis';
import AgentPipeline from '../../components/layout/AgentPipeline';

function confidenceMeta(level = 'low') {
  const l = level.toLowerCase();
  if (l === 'high')   return { label: 'High confidence',   style: { color: 'var(--color-accent)', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' } };
  if (l === 'medium') return { label: 'Medium confidence', style: { color: 'var(--color-amber-warn)', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' } };
  return                     { label: 'Low confidence',    style: { color: 'var(--text-muted)', background: 'var(--surface-soft)', border: '1px solid var(--border-soft)' } };
}

function DiagnosisCard({ diagnosis }) {
  if (!diagnosis) return null;
  const conf = confidenceMeta(diagnosis.confidence);

  return (
    <div className="animate-slide-in-up">
      {/* ESG alert — above card */}
      {diagnosis.esg_flag && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '13px 16px', marginBottom: 12, borderRadius: 12,
          border: '1px solid rgba(239,68,68,0.28)',
          background: 'rgba(239,68,68,0.07)',
        }}>
          <ShieldAlert size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(252,165,165,0.85)' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: '#ef4444', marginRight: 10, fontWeight: 600,
            }}>ESG Flag</span>
            {diagnosis.esg_note}
          </p>
        </div>
      )}

      <div className="panel" style={{ overflow: 'hidden' }}>

        {/* Header: title + confidence badge */}
        <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border-softer)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                margin: 0,
                fontSize: 'clamp(1rem, 1.5vw, 1.25rem)',
                fontWeight: 600, lineHeight: 1.3,
                color: 'var(--text-primary)', letterSpacing: '-0.01em',
              }}>
                {diagnosis.root_cause || 'Root cause undetermined'}
              </h3>
              {diagnosis.root_cause_detail && (
                <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-muted)', maxWidth: '68ch' }}>
                  {diagnosis.root_cause_detail}
                </p>
              )}
            </div>
            <span style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center',
              padding: '4px 12px', borderRadius: 999,
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
              textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap',
              ...conf.style,
            }}>
              {conf.label}
            </span>
          </div>
        </div>

        {/* Meta: anomaly location + primary action */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-softer)' }}>
          <div style={{ padding: '16px 24px', borderRight: '1px solid var(--border-softer)' }}>
            <p className="muted-kicker" style={{ marginBottom: 7 }}>Anomaly at</p>
            <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5 }}>
              {diagnosis.anomaly_at || '—'}
            </p>
          </div>
          <div style={{ padding: '16px 24px' }}>
            <p className="muted-kicker" style={{ marginBottom: 7 }}>Primary action</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.55 }}>
              {diagnosis.primary_action || '—'}
            </p>
          </div>
        </div>

        {/* Next steps */}
        {diagnosis.next_steps?.length > 0 && (
          <div style={{ padding: '20px 24px' }}>
            <p className="muted-kicker" style={{ marginBottom: 14 }}>Recommended next steps</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {diagnosis.next_steps.map((step, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '11px 14px', borderRadius: 10,
                  border: '1px solid var(--border-softer)',
                  background: 'var(--surface-inset)',
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                    color: 'var(--color-accent)',
                    background: 'rgba(124,58,237,0.12)',
                    border: '1px solid rgba(124,58,237,0.25)',
                    marginTop: 1,
                  }}>{i + 1}</span>
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-soft)' }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DebugPanel({ activePanel, streamingReasoning, streamingOutput }) {
  if (!activePanel) return null;
  return (
    <div className="panel-inset" style={{ padding: '18px 20px', maxHeight: 220, overflowY: 'auto' }}>
      {activePanel === 'reasoning' && (
        <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.7, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {streamingReasoning || 'No reasoning captured.'}
        </pre>
      )}
      {activePanel === 'output' && (
        <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.7, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {streamingOutput || 'No output captured.'}
        </pre>
      )}
      {activePanel === 'rules' && (
        <div>
          {[
            { code: 'pH < 3.8',   desc: 'ESG risk threshold' },
            { code: 'pH > 5.5',   desc: 'Precipitation indicator' },
            { code: '> 15% drop', desc: 'Yield anomaly trigger' },
          ].map(({ code, desc }, i, arr) => (
            <div key={code} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '10px 0',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border-softer)' : 'none',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 9px',
                borderRadius: 6, flexShrink: 0,
                background: 'var(--surface-soft)', border: '1px solid var(--border-soft)',
                color: 'var(--color-accent)',
              }}>{code}</span>
              <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiagnosisModule() {
  const {
    isStreaming,
    streamingReasoning,
    streamingOutput,
    diagnosis,
    uploadedFile,
    error,
    startDiagnosis,
    runDemo,
  } = useDiagnosis();

  const [isDragOver, setIsDragOver] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const fileInput = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) startDiagnosis(file);
  }, [startDiagnosis]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) startDiagnosis(file);
  }, [startDiagnosis]);

  const togglePanel = (key) => setActivePanel(p => p === key ? null : key);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>

      <ModuleHero
        step="01"
        eyebrow="Agents 0, 1, & 2 · Process Diagnosis" 
        title="Process Diagnosis"
        lead="Upload a field log or run demo to get a clear diagnosis with recommended actions."
        inputs={['Field Log', 'Sensor Data']}
        outputs={['Root Cause', 'Actions']}
      />
    
      {/* Upload zone */}
      {!uploadedFile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInput.current?.click()}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 14, padding: '44px 24px',
              borderRadius: 16, cursor: 'pointer',
              border: `1.5px dashed ${isDragOver ? 'rgba(124,58,237,0.6)' : 'var(--border-soft)'}`,
              background: isDragOver ? 'rgba(124,58,237,0.05)' : 'transparent',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
              color: 'var(--color-accent)',
            }}>
              <Upload size={17} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>Upload field log</p>
              <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>Drag & drop or click to browse</p>
            </div>
            <input ref={fileInput} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
        </div>
      )}

      {/* Uploaded file indicator */}
      {uploadedFile && (
        <div className="panel-inset--soft" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px' }}>
          <FileText size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {uploadedFile.name}
          </span>
          <CheckCircle size={13} style={{ flexShrink: 0, color: '#16a34a' }} />
        </div>
      )}

      {/* Streaming progress */}
      {isStreaming && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          <span className="mono-meta">Analysing log…</span>
          <div className="progress-bar-wrap" style={{ flex: 1 }}>
            <div className="progress-bar-indeterminate" />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{
          padding: '13px 16px', borderRadius: 10,
          border: '1px solid rgba(239,68,68,0.25)',
          background: 'rgba(239,68,68,0.06)',
        }}>
          <p style={{ margin: 0, fontSize: 13, color: '#ef4444' }}>{error}</p>
        </div>
      )}

      {/* Diagnosis card */}
      <DiagnosisCard diagnosis={diagnosis} />

      {/* Debug panel toggles */}
      {diagnosis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { key: 'reasoning', label: 'AI reasoning' },
              { key: 'output',    label: 'Structured output' },
              { key: 'rules',     label: 'Domain rules' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => togglePanel(key)}
                className="btn btn-ghost"
                style={{
                  padding: '6px 13px', borderRadius: 8,
                  minHeight: 'unset', fontSize: 12,
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                  ...(activePanel === key ? {
                    background: 'rgba(124,58,237,0.12)',
                    borderColor: 'rgba(124,58,237,0.35)',
                    color: 'var(--color-accent)',
                  } : {}),
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <DebugPanel
            activePanel={activePanel}
            streamingReasoning={streamingReasoning}
            streamingOutput={streamingOutput}
          />
        </div>
      )}
    </div>
  );
}