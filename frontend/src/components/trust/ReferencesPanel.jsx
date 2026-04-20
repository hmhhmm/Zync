import { BookOpen } from 'lucide-react';

export default function ReferencesPanel({ references = [], title = 'Citations' }) {
  if (!references || references.length === 0) return null;
  return (
    <div className="panel-inset p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={13} className="text-[var(--color-accent)]" />
          <span className="mono-meta text-white/75">{title} ({references.length})</span>
        </div>
        <span className="mono-meta" style={{ fontSize: 9.5 }}>Peer-reviewed · always visible</span>
      </div>
      <div className="ref-list">
        {references.map((ref, i) => (
          <div key={i} className="ref-item">
            <span className="ref-item__idx">[{i + 1}]</span>
            <div className="min-w-0">
              <p className="ref-item__title">{ref.title}</p>
              <p className="ref-item__meta">
                {ref.journal}
                {ref.doi ? <> · DOI <span className="text-white/70">{ref.doi}</span></> : null}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
