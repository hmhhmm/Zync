import { useState } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';

export default function LogicExplorer({ chainOfThought, title = 'Reasoning Trace', defaultOpen = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  if (!chainOfThought) return null;
  const { reasoning_content } = chainOfThought;
  if (!reasoning_content) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full rounded-xl panel-inset--soft px-4 py-3 text-left flex items-center justify-between cursor-pointer transition-colors"
        style={{ borderColor: isExpanded ? 'var(--border-accent)' : 'var(--border-softer)' }}
        id="logic-explorer-toggle"
      >
        <div className="flex items-center gap-2">
          <Brain size={14} style={{ color: 'var(--color-accent)' }} />
          <span className="mono-meta">{title}</span>
        </div>
        {isExpanded
          ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
      </button>

      {isExpanded && (
        <div className="mt-2 animate-slide-up panel-inset--soft p-4">
          <pre
            className="text-[12px] leading-relaxed font-mono whitespace-pre-wrap"
            style={{ color: 'var(--text-soft)' }}
          >
            {reasoning_content}
          </pre>
        </div>
      )}
    </div>
  );
}
