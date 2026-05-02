import { ChevronRight } from 'lucide-react';
import { RefreshCcw } from 'lucide-react';

const AGENTS = [
  { id: 0, label: 'Agentic RAG', sub: 'Router · decides next agent', critical: true },
  { id: 1, label: 'GraphRAG', sub: 'Malaysian geological knowledge graph' },
  { id: 2, label: 'SciGLM', sub: 'College-level scientific reasoning', critical: true },
  { id: 3, label: 'Optimizer + SQL', sub: 'Stores / queries iteration results' },
  { id: 4, label: 'ESG Hybrid', sub: 'Regulatory & radiological thresholds', critical: true },
  { id: 5, label: 'Report', sub: 'Synthesis · explainable output', critical: true },
  { id: 6, label: 'Zone Scorer', sub: 'Economic · ESG · Strategic · Infra', critical: true },
];

export default function AgentPipeline({ activeIds, title = 'Agent Pipeline', variant = 'full' }) {

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

  // Map the variant to the agents actually displayed on screen for accurate counting
  const displayConfigs = {
    diagnosis: [0, 2],
    lixiviant: [0, 1, 2, 3, 4],
    zone: [0, 1, 2, 3, 4, 6, 5],
    full: [0, 1, 2, 3, 4, 5, 6]
  };

  const displayedAgentIds = displayConfigs[variant] || displayConfigs.full;
  // If no activeIds provided, all agents in this variant are active
  const activeSet = new Set(activeIds ?? displayedAgentIds);
  const isActive = (id) => activeSet.has(id);
  const visibleActiveCount = displayedAgentIds.filter(id => activeSet.has(id)).length;

  // Render the specific arrangement based on the variant prop
  const renderFlowLayout = () => {
    switch (variant) {
      case 'diagnosis':
        // Clean, simple line for 0, 1, and 2
        return (
          <>
            {renderNode(AGENTS[0])}
            {arrow('diag0')}
            {renderNode(AGENTS[2])}
          </>
        );

      case 'lixiviant':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span className="mono-meta" style={{
              color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <RefreshCcw size={11} /> Iterative Optimization Loop
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {renderNode(AGENTS[0])}
              {arrow('lix0')}
              {renderNode(AGENTS[1])}
              {arrow('lix1')}
              {renderNode(AGENTS[2])}
              {arrow('lix2')}
              <div className="agent-parallel">
                {renderNode(AGENTS[3])}
                {renderNode(AGENTS[4])}
                <span className="agent-parallel__bracket" aria-hidden />
              </div>
            </div>
          </div>
        );

      case 'zone':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {renderNode(AGENTS[0])}
            {arrow('z0')}
            {renderNode(AGENTS[1])}
            {arrow('z1')}
            {renderNode(AGENTS[2])}
            {arrow('z2')}
            <div className="agent-parallel">
              {renderNode(AGENTS[3])}
              {renderNode(AGENTS[4])}
              <span className="agent-parallel__bracket" aria-hidden />
            </div>
            {arrow('z3')}
            {renderNode(AGENTS[6])}
            {arrow('z4')}
            {renderNode(AGENTS[5])}
          </div>
        );

      case 'full':
      default:
        return (
          <>
            {renderNode(AGENTS[0])}
            {arrow('f0')}
            {renderNode(AGENTS[1])}
            {arrow('f1')}
            {renderNode(AGENTS[2])}
            {arrow('f2')}
            <div className="agent-parallel">
              {renderNode(AGENTS[3])}
              {renderNode(AGENTS[4])}
              <span className="agent-parallel__bracket" aria-hidden />
              <span className="agent-parallel__tag">parallel loop</span>
            </div>
            {arrow('f3')}
            {renderNode(AGENTS[5])}
          </>
        );
    }
  };

  return (
    <section className="agent-pipeline" aria-label="Agent pipeline">
      <div className="agent-pipeline__header">
        <div className="flex items-center gap-2">
          <span className="status-dot status-dot--live" />
          <span className="agent-pipeline__title">{title}</span>
        </div>
        <span className="mono-meta">
          {visibleActiveCount}/{displayedAgentIds.length} Active · GLM-5.1 MoE
        </span>
      </div>

      <div className="agent-flow">
        {renderFlowLayout()}
      </div>
    </section>
  );
}