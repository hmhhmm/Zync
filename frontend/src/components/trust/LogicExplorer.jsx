import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';

export default function LogicExplorer({ chainOfThought, title = 'Reasoning Trace', defaultOpen = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  if (!chainOfThought) return null;
  const { reasoning_content } = chainOfThought;
  if (!reasoning_content) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full rounded-xl panel-inset--soft px-4 py-3 text-left flex items-center justify-between cursor-pointer hover:border-white/20 transition-colors"
        id="logic-explorer-toggle"
      >
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-[var(--color-accent)]" />
          <span className="mono-meta text-white/75">{title}</span>
        </div>
        {isExpanded ? <ChevronDown size={15} className="text-white/50" /> : <ChevronRight size={15} className="text-white/50" />}
      </button>

      {isExpanded && (
        <div className="mt-3 animate-slide-up panel-inset--soft p-4">
          <pre className="text-[12.5px] leading-relaxed font-mono text-white/80 whitespace-pre-wrap">{reasoning_content}</pre>
        </div>
      )}
    </div>
  );
}
