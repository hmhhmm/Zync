import { ChevronRight } from 'lucide-react';

const AGENTS = [
  { id: 0, label: 'Agentic RAG', sub: 'Router · decides next agent', critical: true },
  { id: 1, label: 'GraphRAG', sub: 'Malaysian geological knowledge graph' },
  { id: 2, label: 'SciGLM', sub: 'College-level scientific reasoning', critical: true },
  { id: 3, label: 'Optimizer + SQL', sub: 'Stores / queries iteration results' },
  { id: 4, label: 'ESG Hybrid', sub: 'Regulatory & radiological thresholds', critical: true },
  { id: 5, label: 'Report', sub: 'Synthesis · explainable output', critical: true },
  { id: 6, label: 'Zone Scorer', sub: 'Economic · ESG · Strategic · Infra', critical: true },
];

export default function AgentPipeline({ activeIds = [], title = 'Agent Pipeline' }) {
  const activeSet = new Set(activeIds);
  const isActive = (id) => activeSet.has(id);

  // Count unique active agents (0-6)
  const activeCount = AGENTS.filter((a) => activeSet.has(a.id)).length;

  const renderNode = (agent) => (
    <div
      key={agent.id}
      className={`agent-node ${isActive(agent.id) ? 'agent-node--active' : ''} ${agent.critical ? 'agent-node--critical' : ''}`}
    >
      <span className="agent-node__idx">Agent {String(agent.id).padStart(2, '0')}</span>
      <span className="agent-node__label">{agent.label}</span>
      <span className="agent-node__sub">{agent.sub}</span>
    </div>
  );

  const arrow = (key) => (
    <span key={key} className="agent-arrow" aria-hidden>
      <ChevronRight size={14} />
    </span>
  );

  // Zone strategy: simplified 3-node flow (0 → 1 → 6)
  const isZoneMode = activeSet.has(6) && !activeSet.has(2);

  return (
    <section className="agent-pipeline" aria-label="Agent pipeline">
      <div className="agent-pipeline__header">
        <div className="flex items-center gap-2">
          <span className="status-dot status-dot--live" />
          <span className="agent-pipeline__title">{title}</span>
        </div>
        <span className="mono-meta">{activeCount}/{AGENTS.length} Active · GLM-5.1 MoE</span>
      </div>

      <div className="agent-flow">
        {isZoneMode ? (
          <>
            {renderNode(AGENTS[0])}
            {arrow('z0')}
            {renderNode(AGENTS[1])}
            {arrow('z1')}
            {renderNode(AGENTS[6])}
          </>
        ) : (
          <>
            {renderNode(AGENTS[0])}
            {arrow('a0')}
            {renderNode(AGENTS[1])}
            {arrow('a1')}
            {renderNode(AGENTS[2])}
            {arrow('a2')}
            <div className="agent-parallel">
              {renderNode(AGENTS[3])}
              {renderNode(AGENTS[4])}
              <span className="agent-parallel__bracket" aria-hidden />
              <span className="agent-parallel__tag">parallel loop</span>
            </div>
            {arrow('a3')}
            {renderNode(AGENTS[5])}
          </>
        )}
      </div>
    </section>
  );
}
