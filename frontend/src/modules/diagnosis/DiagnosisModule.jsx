import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock3, FileImage, Loader2, Play, Upload, WifiOff } from 'lucide-react';
import ModuleHero from '../../components/layout/ModuleHero';
import LogicExplorer from '../../components/trust/LogicExplorer';
import ReferencesPanel from '../../components/trust/ReferencesPanel';
import useDiagnosis from '../../hooks/useDiagnosis';

const METHODOLOGY = [
  'XRD · ICDD PDF-4+ match',
  'SEM-EDS · ZAF correction',
  'Bootstrap n=1000 · CI 95%',
];

export default function DiagnosisModule() {
  const {
    steps,
    isStreaming,
    chainOfThought,
    uploadedFile,
    sessionInfo,
    error,
    fetchDiagnosisSession,
    startDiagnosis,
    runDemo,
  } = useDiagnosis();

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    fetchDiagnosisSession();
  }, [fetchDiagnosisSession]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) startDiagnosis(file);
  }, [startDiagnosis]);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) startDiagnosis(file);
  }, [startDiagnosis]);

  const statusLabel = isStreaming
    ? 'SciGLM reasoning live'
    : steps.length > 0
      ? 'Diagnosis complete'
      : 'Awaiting evidence';

  const overallConfidence = steps.length
    ? Math.round(steps.reduce((sum, s) => sum + Number(s.confidence || 0), 0) / steps.length)
    : null;

  return (
    <section className="panel panel-pad grid gap-6" id="diagnosis-module">
      <ModuleHero
        step="01"
        eyebrow="Agents 00 · 02 · 05"
        title="Evidence Diagnosis"
        lead="Convert XRD, SEM-EDS, and operator logs into a stepwise reasoning trace with confidence bounds and inline citations."
        inputs={['XRD pattern', 'SEM image', 'Operator logs', 'Geological PDF']}
        outputs={['Mineral ID', 'Grade estimate', 'Route suggestion', 'Regulatory flags']}
      />

      <div className="flex flex-wrap gap-2">
        {METHODOLOGY.map((m) => (
          <span key={m} className="chip">{m}</span>
        ))}
      </div>

      {error && (
        <div className="panel-inset--soft px-4 py-3 text-xs font-mono text-[var(--color-amber-warn)] border-[rgba(245,158,11,0.4)] inline-flex items-center gap-2">
          <WifiOff size={13} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 2xl:grid-cols-5 gap-5">
        <div className="2xl:col-span-2 grid gap-4">
          {!uploadedFile ? (
            <div
              className={`panel-inset p-0 min-h-[300px] border-dashed transition-colors cursor-pointer ${
                isDragOver ? 'border-[rgba(167,139,250,0.6)] bg-[rgba(124,58,237,0.08)]' : ''
              }`}
              id="upload-zone"
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInput.current?.click()}
            >
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center px-7 py-8">
                <div className="w-12 h-12 rounded-2xl border border-[rgba(167,139,250,0.4)] bg-[rgba(124,58,237,0.18)] text-white flex items-center justify-center">
                  <Upload size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">Drop or Select Evidence</h3>
                <p className="mt-2 text-sm text-white/60 leading-relaxed max-w-[40ch]">
                  Accepts .raw · .csv · .png · .tiff · geological PDFs. The router selects the next agent automatically.
                </p>
                <div className="mt-4 source-row justify-center">
                  <span className="source-chip source-chip--active">POST /api/diagnosis</span>
                  <span className="source-chip">SSE stream</span>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".raw,.csv,.png,.jpg,.tiff,.xrd"
                />
              </div>
            </div>
          ) : (
            <div className="panel-inset--accent p-5" id="uploaded-file-preview">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl border border-[rgba(167,139,250,0.4)] bg-[rgba(124,58,237,0.2)] text-white flex items-center justify-center">
                  <FileImage size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-white truncate">{uploadedFile.name}</p>
                  <p className="mono-meta mt-1" style={{ fontSize: 10 }}>
                    {(uploadedFile.size / 1024).toFixed(1)} KB · {uploadedFile.type || 'binary/raw'}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-[160px] panel-inset--soft p-3 flex items-end gap-[2px] overflow-hidden">
                {Array.from({ length: 90 }, (_, i) => {
                  const peaks = [16, 24, 35, 52, 68, 78];
                  const isPeak = peaks.some((peak) => Math.abs(i - peak) < 2);
                  const height = isPeak ? 70 + Math.random() * 70 : 12 + Math.random() * 16;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm"
                      style={{
                        height: `${height}px`,
                        opacity: isPeak ? 1 : 0.32,
                        background: 'linear-gradient(180deg, #b8bfff, #7c3aed)',
                      }}
                    />
                  );
                })}
              </div>
              <p className="mono-meta mt-2 text-center" style={{ fontSize: 10 }}>Diffractogram · 2θ 10°→80° · Cu-Kα</p>

              {overallConfidence !== null && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="panel-inset--soft px-3 py-2.5 text-center">
                    <p className="mono-meta" style={{ fontSize: 9.5 }}>Steps</p>
                    <p className="text-white font-mono font-semibold mt-1.5">{steps.length}/8</p>
                  </div>
                  <div className="panel-inset--soft px-3 py-2.5 text-center">
                    <p className="mono-meta" style={{ fontSize: 9.5 }}>Mean Conf.</p>
                    <p className="text-[var(--color-accent-bright)] font-mono font-semibold mt-1.5">{overallConfidence}%</p>
                  </div>
                  <div className="panel-inset--soft px-3 py-2.5 text-center">
                    <p className="mono-meta" style={{ fontSize: 9.5 }}>Status</p>
                    <p className="text-white font-mono font-semibold mt-1.5">{isStreaming ? 'Live' : 'Done'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!uploadedFile && (
            <button onClick={runDemo} className="btn btn-secondary w-full" id="run-demo-btn">
              <Play size={15} />
              Run Guided Demo · Perak XRD
            </button>
          )}

          {sessionInfo?.region && (
            <div className="panel-inset--soft px-4 py-3">
              <p className="mono-meta" style={{ fontSize: 9.5 }}>Active session</p>
              <p className="text-xs font-mono text-white/75 mt-1.5">{sessionInfo.region} · {sessionInfo.model ?? 'GLM-5.1'}</p>
            </div>
          )}
        </div>

        <div className="panel-inset--accent p-5 md:p-6 2xl:col-span-3" id="reasoning-console">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`status-dot ${isStreaming ? 'status-dot--live' : ''}`} />
              <span className="mono-meta">{statusLabel}</span>
            </div>
            <span className="mono-meta" style={{ fontSize: 10 }}>
              {steps.length > 0 ? `${steps.length} of 8 steps` : 'Agent 02 · SciGLM'}
            </span>
          </div>

          {steps.length === 0 && !isStreaming && (
            <div className="h-[260px] panel-inset--soft flex flex-col items-center justify-center text-center px-10 text-white/55 gap-2">
              <p className="text-sm">Upload evidence to begin autonomous diagnosis.</p>
              <p className="text-xs text-white/40 max-w-[40ch]">
                Every reasoning step exposes its confidence interval and literature citation before the final recommendation is issued.
              </p>
            </div>
          )}

          <div className="grid gap-2.5 max-h-[520px] overflow-y-auto pr-1">
            {steps.map((step, index) => (
              <div
                key={step.step}
                className="panel-inset--soft p-4 animate-slide-up"
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="mono-meta" style={{ fontSize: 10 }}>Step {step.step}</p>
                    <p className="text-[14px] text-white font-semibold mt-1.5 leading-tight">{step.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="mono-meta inline-flex items-center gap-1" style={{ fontSize: 10 }}>
                      <Clock3 size={10} />
                      {step.duration}
                    </span>
                    <span className="text-[10px] rounded-md px-2 py-0.5 bg-[rgba(124,58,237,0.22)] border border-[rgba(167,139,250,0.35)] text-[#ddd6fe] font-mono">
                      {step.confidence}%
                    </span>
                    {index < steps.length - 1 || !isStreaming ? (
                      <CheckCircle size={14} className="text-[var(--color-accent)]" />
                    ) : (
                      <Loader2 size={14} className="text-[var(--color-amber-warn)] animate-spin" />
                    )}
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed text-white/70 mt-2">{step.detail}</p>
              </div>
            ))}

            {isStreaming && (
              <div className="text-xs font-mono text-[var(--color-amber-warn)] inline-flex items-center gap-2 px-2 py-1">
                <Loader2 size={12} className="animate-spin" />
                Composing next reasoning step…
              </div>
            )}
          </div>
        </div>
      </div>

      {chainOfThought?.references?.length > 0 && (
        <ReferencesPanel references={chainOfThought.references} title="Cited literature" />
      )}

      {chainOfThought?.reasoning_content && (
        <LogicExplorer chainOfThought={chainOfThought} title="Full reasoning trace · Agent 05" />
      )}
    </section>
  );
}
