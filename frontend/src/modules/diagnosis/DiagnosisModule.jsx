import { useCallback, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  FileImage,
  Loader2,
  Play,
  ShieldAlert,
  Upload,
  WifiOff,
} from 'lucide-react';
import ModuleHero from '../../components/layout/ModuleHero';
import useDiagnosis from '../../hooks/useDiagnosis';

const CONFIDENCE_TONE = {
  HIGH:   'text-[var(--color-accent-bright)] bg-[rgba(124,58,237,0.22)] border-[rgba(167,139,250,0.45)]',
  MEDIUM: 'text-[var(--color-amber-warn)] bg-[rgba(245,158,11,0.14)] border-[rgba(245,158,11,0.4)]',
  LOW:    'text-red-300 bg-red-500/10 border-red-500/40',
};

function DiagnosisCard({ diagnosis }) {
  if (!diagnosis) return null;

  const conf = (diagnosis.confidence ?? 'LOW').toUpperCase();
  const confTone = CONFIDENCE_TONE[conf] ?? CONFIDENCE_TONE.LOW;

  return (
    <div className="panel-inset--accent p-5 md:p-6 grid gap-5" id="diagnosis-card">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="muted-kicker">Diagnosis Result · Process Diagnosis Agent</p>
          <h3 className="text-[17px] font-semibold text-white leading-tight mt-2">
            {diagnosis.root_cause ?? 'Root cause undetermined'}
          </h3>
          {diagnosis.root_cause_detail && (
            <p className="text-[13px] text-white/65 leading-relaxed mt-1.5 max-w-[65ch]">
              {diagnosis.root_cause_detail}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {diagnosis.esg_flag && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border text-red-300 bg-red-500/10 border-red-500/40">
              <ShieldAlert size={11} />
              ESG FLAG
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border ${confTone}`}>
            {conf} confidence
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel-inset--soft p-4">
          <p className="mono-meta text-[9.5px]">Anomaly detected at</p>
          <p className="text-[13px] text-white/85 font-mono mt-1.5">
            {diagnosis.anomaly_at ?? '—'}
          </p>
        </div>
        <div className="panel-inset--soft p-4">
          <p className="mono-meta text-[9.5px]">Primary action</p>
          <p className="text-[13px] text-white/85 leading-relaxed mt-1.5">
            {diagnosis.primary_action ?? '—'}
          </p>
        </div>
      </div>

      {diagnosis.esg_flag && diagnosis.esg_note && (
        <div className="panel-inset--soft px-4 py-3 border border-red-500/30 flex items-start gap-2">
          <ShieldAlert size={14} className="text-red-300 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-200/80 leading-relaxed">{diagnosis.esg_note}</p>
        </div>
      )}

      {diagnosis.next_steps?.length > 0 && (
        <div>
          <p className="mono-meta text-[9.5px] mb-2">Next steps</p>
          <ol className="grid gap-1.5">
            {diagnosis.next_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-[10px] font-mono text-[var(--color-accent-bright)] w-4 shrink-0 mt-0.5">
                  {i + 1}.
                </span>
                <span className="text-[12.5px] text-white/75 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {diagnosis.confidence_reason && (
        <details>
          <summary className="mono-meta cursor-pointer text-white/45 hover:text-white/65 text-[9.5px]">
            Confidence rationale
          </summary>
          <p className="mt-1.5 text-[12px] text-white/60 leading-relaxed">
            {diagnosis.confidence_reason}
          </p>
        </details>
      )}

      {diagnosis.error && diagnosis.raw_output && (
        <details>
          <summary className="mono-meta cursor-pointer text-[var(--color-amber-warn)] text-[9.5px]">
            Raw model output (parse error — expand to inspect)
          </summary>
          <pre className="mt-2 text-[11px] font-mono leading-relaxed text-white/60 whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
            {diagnosis.raw_output}
          </pre>
        </details>
      )}
    </div>
  );
}

function ReadingsPanel({ extracted }) {
  if (!extracted) return null;
  const { ph_readings, temperature, yield_pct, source } = extracted;
  if (!ph_readings?.length && !temperature?.length && !yield_pct?.length) return null;

  return (
    <div className="panel-inset p-5" id="extracted-readings">
      <p className="muted-kicker mb-3">
        Extracted readings · source: {source ?? 'structured'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11.5px] font-mono">
        {ph_readings?.length > 0 && (
          <div className="panel-inset--soft p-3">
            <p className="mono-meta text-[9.5px] mb-1.5">pH over time</p>
            <p className="text-white/80">{ph_readings.join(' → ')}</p>
          </div>
        )}
        {temperature?.length > 0 && (
          <div className="panel-inset--soft p-3">
            <p className="mono-meta text-[9.5px] mb-1.5">Temperature (°C)</p>
            <p className="text-white/80">{temperature.join(' → ')}</p>
          </div>
        )}
        {yield_pct?.length > 0 && (
          <div className="panel-inset--soft p-3">
            <p className="mono-meta text-[9.5px] mb-1.5">Yield (%)</p>
            <p className="text-white/80">{yield_pct.join(' → ')}</p>
          </div>
        )}
      </div>
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
    isLive,
    startDiagnosis,
    runDemo,
  } = useDiagnosis();

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInput = useRef(null);

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
    ? 'GLM reasoning live'
    : diagnosis
      ? 'Diagnosis complete'
      : 'Awaiting log data';

  return (
    <section className="panel panel-pad grid gap-6" id="diagnosis-module">
      <ModuleHero
        step="01"
        eyebrow="Process Diagnosis Agent · Decision 1"
        title="Process Diagnosis"
        lead="Upload a photo of a handwritten field log or send structured sensor readings. GLM reads multimodally, identifies the anomaly, and outputs a diagnosis card with ESG flags."
        inputs={['Handwritten log photo', 'pH readings', 'Yield readings', 'Operator notes']}
        outputs={['Root cause', 'Anomaly location', 'Primary action', 'ESG flag']}
      />

      {error && (
        <div className="panel-inset--soft px-4 py-3 text-xs font-mono text-[var(--color-amber-warn)] border-[rgba(245,158,11,0.4)] inline-flex items-center gap-2">
          <WifiOff size={13} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 2xl:grid-cols-5 gap-5">
        {/* Left — Upload */}
        <div className="2xl:col-span-2 grid gap-4">
          {!uploadedFile ? (
            <div
              className={`panel-inset p-0 min-h-[280px] border-dashed transition-colors cursor-pointer ${
                isDragOver ? 'border-[rgba(167,139,250,0.6)] bg-[rgba(124,58,237,0.08)]' : ''
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInput.current?.click()}
            >
              <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center px-7 py-8">
                <div className="w-12 h-12 rounded-2xl border border-[rgba(167,139,250,0.4)] bg-[rgba(124,58,237,0.18)] text-white flex items-center justify-center">
                  <Upload size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">Upload Field Log Photo</h3>
                <p className="mt-2 text-sm text-white/60 leading-relaxed max-w-[38ch]">
                  Accepts JPG · PNG · TIFF of handwritten process logs.
                  GLM extracts readings multimodally.
                </p>
                <div className="mt-4 source-row justify-center">
                  <span className="source-chip source-chip--active">POST /api/diagnose</span>
                  <span className="source-chip">SSE stream</span>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.tiff,.tif,.webp"
                />
              </div>
            </div>
          ) : (
            <div className="panel-inset--accent p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl border border-[rgba(167,139,250,0.4)] bg-[rgba(124,58,237,0.2)] text-white flex items-center justify-center">
                  <FileImage size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-white truncate">{uploadedFile.name}</p>
                  <p className="mono-meta mt-1" style={{ fontSize: 10 }}>
                    {uploadedFile.size ? `${(uploadedFile.size / 1024).toFixed(1)} KB · ` : ''}
                    {uploadedFile.type || 'image/jpeg'}
                  </p>
                </div>
              </div>

              {isStreaming && (
                <div className="mt-4 flex items-center gap-2 text-xs font-mono text-[var(--color-amber-warn)]">
                  <Loader2 size={12} className="animate-spin" />
                  GLM reading log…
                </div>
              )}

              {diagnosis && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="panel-inset--soft px-3 py-2.5 text-center">
                    <p className="mono-meta" style={{ fontSize: 9.5 }}>Confidence</p>
                    <p className="text-white font-mono font-semibold mt-1.5 text-[12px]">
                      {(diagnosis.confidence ?? '—').toUpperCase()}
                    </p>
                  </div>
                  <div className="panel-inset--soft px-3 py-2.5 text-center">
                    <p className="mono-meta" style={{ fontSize: 9.5 }}>ESG Flag</p>
                    <p className={`font-mono font-semibold mt-1.5 text-[12px] ${diagnosis.esg_flag ? 'text-red-300' : 'text-green-300'}`}>
                      {diagnosis.esg_flag ? 'YES' : 'CLEAR'}
                    </p>
                  </div>
                  <div className="panel-inset--soft px-3 py-2.5 text-center">
                    <p className="mono-meta" style={{ fontSize: 9.5 }}>Source</p>
                    <p className="text-white font-mono font-semibold mt-1.5 text-[12px]">
                      {isLive ? 'Live' : '—'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!uploadedFile && (
            <button onClick={runDemo} className="btn btn-secondary w-full" id="run-demo-btn">
              <Play size={15} />
              Run Demo · pH Crash Scenario (Day 2)
            </button>
          )}

          <div className="panel-inset--soft px-4 py-3">
            <p className="mono-meta" style={{ fontSize: 9.5 }}>Hard domain rules applied</p>
            <ul className="mt-2 grid gap-1">
              {[
                'pH < 3.8 → ESG flag: thorium co-extraction risk',
                'pH > 5.5 → REE precipitation confirmed',
                'Yield drop > 15% → HIGH confidence anomaly',
              ].map((r) => (
                <li key={r} className="flex items-start gap-1.5">
                  <CheckCircle size={10} className="text-[var(--color-accent)] shrink-0 mt-0.5" />
                  <span className="text-[11px] text-white/55 leading-snug">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right — Reasoning + Result */}
        <div className="2xl:col-span-3 grid gap-4">
          {/* Reasoning console */}
          <div className="panel-inset--accent p-5 md:p-6" id="reasoning-console">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`status-dot ${isStreaming ? 'status-dot--live' : ''}`} />
                <span className="mono-meta">{statusLabel}</span>
              </div>
              <span className="mono-meta" style={{ fontSize: 10 }}>
                GLM reasoning trace · live
              </span>
            </div>

            {!isStreaming && !streamingReasoning && !streamingOutput && (
              <div className="h-[200px] panel-inset--soft flex flex-col items-center justify-center text-center px-10 text-white/55 gap-2">
                <p className="text-sm">Upload a field log photo or run the demo to begin.</p>
                <p className="text-xs text-white/40 max-w-[42ch]">
                  GLM will stream its reasoning live as it reads the log, identifies the anomaly, and diagnoses the cause.
                </p>
              </div>
            )}

            {streamingReasoning && (
              <details open>
                <summary className="mono-meta cursor-pointer text-white/55 hover:text-white/75 text-[9.5px] mb-2">
                  Internal thinking trace
                </summary>
                <pre className="text-[11px] font-mono leading-relaxed text-white/55 whitespace-pre-wrap break-words max-h-[180px] overflow-y-auto">
                  {streamingReasoning}
                </pre>
              </details>
            )}

            {streamingOutput && (
              <div className="mt-3">
                <p className="mono-meta text-[9.5px] mb-1.5">Answer building up</p>
                <pre className="text-[11.5px] font-mono leading-relaxed text-white/75 whitespace-pre-wrap break-words max-h-[180px] overflow-y-auto">
                  {streamingOutput}
                </pre>
              </div>
            )}

            {isStreaming && !streamingReasoning && !streamingOutput && (
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-amber-warn)] px-2 py-1">
                <Loader2 size={12} className="animate-spin" />
                Connecting to GLM…
              </div>
            )}
          </div>

          {/* Diagnosis Card */}
          <DiagnosisCard diagnosis={diagnosis} />
        </div>
      </div>

      {/* Extracted readings row */}
      {diagnosis?.extracted_readings && (
        <ReadingsPanel extracted={diagnosis.extracted_readings} />
      )}
    </section>
  );
}
