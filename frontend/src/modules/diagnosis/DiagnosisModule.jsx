import { useCallback, useRef, useState } from 'react';
import { CheckCircle, FileImage, Loader2, Play, ShieldAlert, Upload } from 'lucide-react';
import ModuleHero from '../../components/layout/ModuleHero';
import useDiagnosis from '../../hooks/useDiagnosis';

function TogglePanel({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-6 py-5 text-base leading-relaxed leading-relaxed text-white/70 hover:text-white flex justify-between items-center"
      >
        {title}
        <span className="text-sm text-white/40">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="px-6 pb-6 pt-2">{children}</div>}
    </div>
  );
}

function DiagnosisCard({ diagnosis }) {
  if (!diagnosis) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-12 space-y-10 animate-fade-in w-full">
      {diagnosis.esg_flag && (
        <div className="flex items-start gap-4 p-6 rounded-xl bg-red-500/10 border border-red-500/30">
          <ShieldAlert className="text-red-400" size={22} />
          <div className="text-lg text-red-300 leading-relaxed">
            ESG FLAG — {diagnosis.esg_note}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-4xl font-semibold text-white leading-tight">
          {diagnosis.root_cause || 'Root cause undetermined'}
        </h2>
        {diagnosis.root_cause_detail && (
          <p className="text-lg text-white/60 leading-relaxed max-w-3xl">
            {diagnosis.root_cause_detail}
          </p>
        )}
      </div>

      <div className="flex items-center gap-6">
        <span className="text-lg px-6 py-3 rounded-full bg-white/10 border border-white/20">
          {(diagnosis.confidence || 'LOW').toUpperCase()} confidence
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white/5 p-6 rounded-xl">
          <p className="text-base leading-relaxed text-white/40 mb-3">Anomaly detected at</p>
          <p className="text-lg text-white/80 font-mono">
            {diagnosis.anomaly_at || '—'}
          </p>
        </div>
        <div className="bg-white/5 p-6 rounded-xl">
          <p className="text-base leading-relaxed text-white/40 mb-3">Primary action</p>
          <p className="text-lg text-white/80 leading-relaxed">
            {diagnosis.primary_action || '—'}
          </p>
        </div>
      </div>

      {diagnosis.next_steps?.length > 0 && (
        <div className="space-y-6">
          <p className="text-base leading-relaxed text-white/40">Recommended next steps</p>
          <ol className="space-y-6">
            {diagnosis.next_steps.map((step, i) => (
              <li key={i} className="flex gap-5 bg-white/5 p-6 rounded-xl">
                <span className="text-lg font-semibold text-white/60">{i + 1}</span>
                <span className="text-lg text-white/70 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
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

  return (
    <section className="w-full max-w-[1400px] mx-auto px-8 py-16 space-y-16">
      <ModuleHero
        step="01"
        eyebrow="Decision 1 · Process Diagnosis"
        title="Process Diagnosis"
        lead="Upload a field log or run demo. Get a clear diagnosis with actions."
      />

      {!uploadedFile && (
        <div
          className={`border-2 border-dashed rounded-3xl p-20 text-center cursor-pointer transition w-full ${
            isDragOver ? 'border-purple-400 bg-purple-500/10' : 'border-white/20 hover:border-white/40'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInput.current?.click()}
        >
          <Upload className="mx-auto mb-8 text-white/60" size={44} />
          <p className="text-2xl text-white font-medium">Upload Field Log</p>
          <p className="text-lg text-white/50 mt-4">Drag & drop or click</p>
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {!uploadedFile && (
        <button onClick={runDemo} className="w-full py-5 rounded-xl bg-white/10 hover:bg-white/20 transition flex items-center justify-center gap-4 text-lg">
          <Play size={20} /> Run Demo
        </button>
      )}

      {uploadedFile && (
        <div className="flex items-center gap-5 bg-white/5 p-6 rounded-xl w-full">
          <FileImage size={22} />
          <div>
            <p className="text-lg text-white">{uploadedFile.name}</p>
          </div>
        </div>
      )}

      {isStreaming && (
        <div className="flex items-center gap-4 text-lg text-yellow-400">
          <Loader2 className="animate-spin" size={20} /> Processing...
        </div>
      )}

      <DiagnosisCard diagnosis={diagnosis} />

      {diagnosis && (
        <div className="space-y-6">

      {/* BUTTON BAR */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'reasoning', label: 'AI Reasoning' },
          { key: 'output', label: 'Structured Output' },
          { key: 'rules', label: 'Domain Rules' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() =>
              setActivePanel(activePanel === item.key ? null : item.key)
            }
            className={`px-5 py-2.5 rounded-xl border text-sm transition ${
              activePanel === item.key
                ? 'bg-white text-black border-white'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* CONTENT PANEL */}
      {activePanel && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
          
          {activePanel === 'reasoning' && (
            <pre className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
              {streamingReasoning}
            </pre>
          )}

          {activePanel === 'output' && (
            <pre className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
              {streamingOutput}
            </pre>
          )}

          {activePanel === 'rules' && (
            <ul className="space-y-3 text-base leading-relaxed text-white/70">
              <li>pH {'<'} 3.8 → ESG risk</li>
              <li>pH {'>'} 5.5 → precipitation</li>
              <li>Yield drop {'>'} 15%</li>
            </ul>
          )}

        </div>
      )}
    </div>
      )}
    </section>
  );
}
