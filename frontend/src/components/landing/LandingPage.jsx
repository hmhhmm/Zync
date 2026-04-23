import {
  ArrowUpRight,
  Atom,
  BrainCircuit,
  Cpu,
  Database,
  FlaskConical,
  Gauge,
  GitBranch,
  Globe,
  MapPin,
  Network,
  Play,
  ScrollText,
  Shield,
  Workflow,
  Zap,
} from 'lucide-react';
import ThemeToggle from '../layout/ThemeToggle';

/* ============================================================
   Static copy
   ============================================================ */

const NAV_LINKS = [
  { href: '#problem', label: 'Problem' },
  { href: '#architecture', label: 'Architecture' },
  { href: '#operator', label: 'Operator' },
  { href: '#delivery', label: 'Delivery' },
  { href: '#impact', label: 'Impact' },
];

const FRAME_TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'reasoning', label: 'Reasoning', active: true },
  { id: 'flowsheet', label: 'Flowsheet' },
  { id: 'esg', label: 'ESG' },
  { id: 'report', label: 'Report' },
];

const STATUS_LABEL = { done: 'ok', streaming: 'live', pending: 'wait' };

const AGENT_ROWS = [
  { idx: '00', label: 'Router', status: 'done' },
  { idx: '01', label: 'Historian · GraphRAG', status: 'done' },
  { idx: '02', label: 'Chemist · SciGLM', status: 'streaming' },
  { idx: '03', label: 'Optimizer · SQL RAG', status: 'pending' },
  { idx: '04', label: 'ESG · Hybrid Search', status: 'pending' },
  { idx: '05', label: 'Reporter', status: 'pending' },
];

const REASONING_LINES = [
  { tone: 'dim', text: '> deposit = Lahad Datu laterite · REE 0.42%, thorium 0.8 ppm' },
  { tone: 'dim', text: '> context: 7 analogous sites retrieved (GraphRAG)' },
  { blank: true },
  { text: 'Clay mineralogy suggests ion-adsorption profile. Ammonium sulfate is the established lixiviant for this matrix.' },
  { blank: true },
  { tone: 'accent', text: 'Optimal pH window: 4.0 – 4.5' },
  { text: 'Rationale — below pH 4.0 accelerates thorium co-extraction, triggering AELB radioactivity thresholds. Above 4.5 yield drops sharply as adsorbed REE remain bound to clay sites.' },
  { blank: true },
  { tone: 'accent', text: 'Predicted yield: 68–72% at 45°C, 90 min contact', cursor: true },
];

const PROBLEMS = [
  {
    icon: Database,
    kicker: 'Market gap · 01',
    title: 'RM 1 trillion locked underground',
    copy: 'Malaysia holds one of the world\u2019s largest rare-earth reserves but exports raw minerals to foreign processors, capturing a fraction of the value chain.',
  },
  {
    icon: Shield,
    kicker: 'Sovereignty · 02',
    title: 'Technological monopoly by design',
    copy: 'NRES confirms a gap in hydrometallurgical expertise. Foreign licenses and black-box IP keep decision authority offshore.',
  },
  {
    icon: Gauge,
    kicker: 'Velocity · 03',
    title: 'Months of manual trial-and-error',
    copy: 'Traditional flowsheet design relies on scarce experts cycling through thousands of variables by hand. Results arrive after the market moves.',
  },
];

const AGENT_CARDS = [
  {
    icon: Network,
    kicker: 'Agent 01 · Historian',
    title: 'GraphRAG over Malaysian geology',
    copy: 'Multi-hop reasoning across deposit \u2192 reagent \u2192 yield \u2192 regulatory outcome. Every recommendation cites an auditable traversal path.',
    tag: 'GraphRAG',
  },
  {
    icon: Atom,
    kicker: 'Agent 02 · Chemist',
    title: 'SciGLM scientific reasoning',
    copy: 'SciInstruct-trained GLM-5.1 generates the first-pass flowsheet grounded in mineralogy and reaction kinetics.',
    tag: 'SciGLM · 202K ctx',
  },
  {
    icon: BrainCircuit,
    kicker: 'Agent 03 · Optimizer',
    title: 'SQL RAG on 600+ iterations',
    copy: 'Structured table of pH, temp, yield, thorium, cost. Deterministic queries, zero number hallucination.',
    tag: 'SQL RAG',
  },
  {
    icon: Shield,
    kicker: 'Agent 04 · ESG Sentinel',
    title: 'Hybrid search on regulation',
    copy: 'Keyword precision for exact thresholds (e.g. thorium \u2264 1.0 Bq/g), semantic search for contextual AELB / DOSM clauses.',
    tag: 'Hybrid Search',
  },
  {
    icon: ScrollText,
    kicker: 'Agent 05 · Reporter',
    title: 'Streaming explainable output',
    copy: 'Reasoning tokens stream live with citations, SFILES 2.0 flowsheet, and KPI block for the operator to inspect.',
    tag: 'XAI',
  },
  {
    icon: Workflow,
    kicker: 'Orchestration · KARMA',
    title: 'One manager, five specialists',
    copy: 'KARMA multi-agent framework. GLM-5.1 routes each sub-task to the correct retrieval strategy, then synthesises.',
    tag: 'KARMA · MoE 744B',
  },
];

const OPERATOR_FLOWS = [
  {
    icon: FlaskConical,
    title: 'Diagnosis',
    input: 'Weekly logs — pH, temperature, flow, output ppm',
    action: 'Causal reasoning links anomalies to operator notes (rainfall, downtime) and proposes corrective action.',
    module: 'diagnosis',
  },
  {
    icon: Cpu,
    title: 'Lixiviant Selection',
    input: 'Clay type, REE concentration, ESG constraints',
    action: 'Predicts reaction yield and optimises reagent parameters before touching the lab.',
    module: 'lixiviant',
  },
  {
    icon: MapPin,
    title: 'Zone Prioritisation',
    input: 'Geological survey, layer depth, accessibility',
    action: 'Multi-variable ranking of zones by yield against regulatory and ESG risk.',
    module: 'zone-strategy',
  },
];

const SFILES_LINES = [
  { tone: 'dim', text: '# Ion-adsorption REE · Lahad Datu' },
  { tone: 'token', text: '(raw)' },
  { tone: 'token', text: '>(crush@2mm)' },
  { tone: 'token', text: '>(leach:NH4SO4,pH4.3,45C)' },
  { tone: 'token', text: '>(filter)' },
  { tone: 'token', text: '>(precip:oxalate)' },
  { tone: 'token', text: '>(calcine:800C)' },
  { tone: 'token', text: '>(REO)' },
  { blank: true },
  { tone: 'ok', text: '# expected yield: 68–72%' },
  { tone: 'ok', text: '# thorium co-extract: 0.42 Bq/g (AELB ok)' },
];

const VALIDATION_TESTS = [
  'DOSM-2023-REE-reserves',
  'AELB-thorium-threshold',
  'MOSTI-midstream-roadmap',
  'BukitBesi-2019-yield-recall',
  'Lahad-Datu-ion-adsorption',
];

const STATS = [
  { value: '89%', label: 'R&D design time reduced' },
  { value: '600+', label: 'iterations per 8h loop' },
  { value: '95.3%', label: 'AIME benchmark' },
  { value: '14.2%', label: 'TFP uplift (13MP)' },
  { value: '202K', label: 'tokens dark-data ctx' },
  { value: '5/5', label: 'known-answer tests pass' },
];

const FOOTER_GROUPS = [
  {
    heading: 'Product',
    items: ['Diagnosis', 'Lixiviant Selection', 'Zone Prioritisation', 'Streaming Reasoning'],
  },
  {
    heading: 'Architecture',
    items: ['GLM-5.1 · SciGLM', 'GraphRAG · SQL RAG', 'Hybrid Search', 'SFILES 2.0 · KARMA'],
  },
  {
    heading: 'Mission',
    items: ['13MP alignment', 'Sovereign data autonomy', 'Midstream capability', 'Explainable AI'],
  },
];

/* ============================================================
   Presentational components
   ============================================================ */

function Nav({ onEnterDashboard }) {
  return (
    <nav className="lp-nav" aria-label="Primary">
      <div className="lp-nav-brand">
        <span className="lp-nav-wordmark">ZYNC</span>
      </div>

      <div className="lp-nav-links">
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>

      <div className="inline-flex items-center gap-2">
        <ThemeToggle />
        <button onClick={onEnterDashboard} id="enter-dashboard-btn" className="lp-nav-cta">
          Launch console
          <ArrowUpRight size={13} />
        </button>
      </div>
    </nav>
  );
}

function Hero({ onEnterDashboard }) {
  return (
    <section className="lp-hero">
      <div className="lp-hero__aura" aria-hidden />

      <h1 className="lp-title">
        Malaysia&rsquo;s sovereign brain for{' '}
        <span className="lp-title__accent">rare-earth engineering.</span>
      </h1>

      <p className="lp-lead">
        Zync turns a RM 1 trillion reserve into a midstream engineering capability.
        Six specialised agents, grounded retrieval, and streaming GLM reasoning compress
        decades of hydrometallurgical trial-and-error into hours &mdash; without exporting
        decision authority offshore.
      </p>

      <div className="lp-hero-actions">
        <button onClick={onEnterDashboard} className="lp-cta-primary">
          Launch Zync console
          <ArrowUpRight size={15} />
        </button>
        <a href="#architecture" className="lp-cta-secondary">
          <Play size={14} />
          See the architecture
        </a>
      </div>

      <a href="#frame" className="lp-scroll-hint" aria-label="Scroll to product">
        <span className="lp-scroll-hint__label">Scroll to explore</span>
        <span className="lp-scroll-hint__line" aria-hidden />
      </a>
    </section>
  );
}

function AgentRow({ row }) {
  const statusClass =
    row.status === 'streaming'
      ? 'lp-agent-row__status--streaming'
      : row.status === 'pending'
      ? 'lp-agent-row__status--pending'
      : '';
  return (
    <div className={`lp-agent-row ${row.status === 'streaming' ? 'lp-agent-row--active' : ''}`}>
      <span className="lp-agent-row__idx">{row.idx}</span>
      <span className="lp-agent-row__label">{row.label}</span>
      <span className={`lp-agent-row__status ${statusClass}`}>{STATUS_LABEL[row.status]}</span>
    </div>
  );
}

function CodeLines({ lines }) {
  return (
    <div className="lp-code-lines">
      {lines.map((line, i) => {
        if (line.blank) return <div key={i} className="lp-code-lines__blank" />;
        const toneClass = line.tone ? `lp-code-lines__line--${line.tone}` : '';
        return (
          <div key={i} className={`lp-code-lines__line ${toneClass}`}>
            {line.text}
            {line.cursor ? <span className="lp-stream__cursor" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function ProductFrame() {
  return (
    <section id="frame" className="lp-frame-section">
      <div className="lp-frame">
        <div className="lp-frame__tabs" role="tablist">
          {FRAME_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={Boolean(tab.active)}
              className={`lp-frame__tab ${tab.active ? 'lp-frame__tab--active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="lp-frame__body">
          <aside className="lp-frame__pane">
            <p className="lp-frame__pane-title">Agent Pipeline</p>
            {AGENT_ROWS.map((row) => (
              <AgentRow key={row.idx} row={row} />
            ))}
          </aside>

          <div className="lp-frame__pane">
            <p className="lp-frame__pane-title">Reasoning stream · Agent 02</p>
            <CodeLines lines={REASONING_LINES} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHead({ kicker, title, lead }) {
  return (
    <div className="lp-section-head">
      <span className="lp-section-kicker">{kicker}</span>
      <h2 className="lp-section-title">{title}</h2>
      {lead ? <p className="lp-lead">{lead}</p> : null}
    </div>
  );
}

function FeatureCard({ data }) {
  const Icon = data.icon;
  return (
    <article className="lp-card">
      <div className="lp-card__icon">
        <Icon size={18} />
      </div>
      {data.kicker ? <p className="lp-card__kicker">{data.kicker}</p> : null}
      <h3 className="lp-card__title">{data.title}</h3>
      <p className="lp-card__copy">{data.copy}</p>
      {data.tag ? (
        <span className="lp-card__tag">
          <GitBranch size={11} />
          {data.tag}
        </span>
      ) : null}
    </article>
  );
}

function OperatorCard({ flow, onNavigate }) {
  const Icon = flow.icon;
  return (
    <article className="lp-card lp-card--operator">
      <div className="lp-card__icon">
        <Icon size={18} />
      </div>
      <h3 className="lp-card__title">{flow.title}</h3>

      <p className="lp-card__kicker">Operator input</p>
      <p className="lp-card__copy">{flow.input}</p>

      <p className="lp-card__kicker">Agentic action</p>
      <p className="lp-card__copy">{flow.action}</p>

      <button
        type="button"
        onClick={() => onNavigate(flow.module)}
        className="lp-card__tag lp-card__tag--button"
      >
        <ArrowUpRight size={11} />
        Open module
      </button>
    </article>
  );
}

function CodePanel({ title, badge, lines, cursor }) {
  return (
    <div className="lp-code-panel">
      <div className="lp-code-panel__head">
        <span className="lp-code-panel__title">{title}</span>
        <span className="lp-code-panel__badge">{badge}</span>
      </div>
      <CodeLines lines={cursor ? [...lines, { tone: 'token', text: '', cursor: true }] : lines} />
    </div>
  );
}

function FinalCTA({ onEnterDashboard, onNavigate }) {
  return (
    <section className="lp-final">
      <div className="lp-sphere" aria-hidden />
      <h2 className="lp-final__title">
        Ready to unlock Malaysia&rsquo;s RM 1 trillion reserve?
      </h2>
      <p className="lp-lead">
        Step into the Zync console. Run a deposit through the full six-agent pipeline
        in under five minutes &mdash; see the reasoning, the flowsheet, and the ESG
        verdict stream in real time.
      </p>
      <div className="lp-hero-actions">
        <button onClick={onEnterDashboard} className="lp-cta-primary">
          Enter the console
          <ArrowUpRight size={15} />
        </button>
        <button onClick={() => onNavigate('diagnosis')} className="lp-cta-secondary">
          <Zap size={14} />
          Start with diagnosis
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-grid">
        <div>
          <p className="lp-footer-brand">ZYNC</p>
          <p className="lp-footer-copy">
            A sovereign agentic engineering hub for Malaysia&rsquo;s rare-earth midstream
            capability. Built on Z.ai GLM-5.1 for UM Hackathon 2026.
          </p>
        </div>

        {FOOTER_GROUPS.map((group) => (
          <div key={group.heading}>
            <p className="lp-footer-heading">{group.heading}</p>
            <ul className="lp-footer-list">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="lp-footer-meta">
        <span>&copy; 2026 Zync · Built for Malaysia&rsquo;s independent REE future</span>
        <span className="lp-footer-location">
          <Globe size={11} aria-hidden />
          Kuala Lumpur &middot; Malaysia
        </span>
      </div>
    </footer>
  );
}

/* ============================================================
   Root
   ============================================================ */

export default function LandingPage({ onEnterDashboard, onNavigate }) {
  return (
    <div className="lp-page relative overflow-hidden">
      <div className="lp-grid-overlay absolute inset-0" />
      <div className="lp-glow lp-glow-top" />
      <div className="lp-glow lp-glow-left" />
      <div className="lp-glow lp-glow-right" />

      <div className="lp-page-wrap relative z-10">
        <Nav onEnterDashboard={onEnterDashboard} />
        <Hero onEnterDashboard={onEnterDashboard} />
        <ProductFrame />

        <section id="problem" className="lp-section">
          <SectionHead
            kicker="01 · The sovereign gap"
            title="A trillion-ringgit resource, trapped behind an expertise wall."
          />
          <div className="lp-bento">
            {PROBLEMS.map((item) => (
              <FeatureCard key={item.title} data={item} />
            ))}
          </div>
        </section>

        <section id="architecture" className="lp-section">
          <SectionHead
            kicker="02 · System architecture"
            title="One orchestration layer. Five grounded experts."
            lead="Most hackathon backends are one GLM call. Zync routes every query through the right retrieval strategy for the right sub-problem — so numbers come from SQL, regulation comes from hybrid search, and chemistry comes from SciGLM."
          />
          <div className="lp-bento">
            {AGENT_CARDS.map((item) => (
              <FeatureCard key={item.title} data={item} />
            ))}
          </div>
        </section>

        <section id="operator" className="lp-section">
          <SectionHead
            kicker="03 · Operator workflows"
            title="Built for site engineers — not data scientists."
            lead="Three decision-support flows. Each takes raw operator input and returns a reasoned, citable recommendation with the human in the loop at every step."
          />
          <div className="lp-bento">
            {OPERATOR_FLOWS.map((flow) => (
              <OperatorCard key={flow.title} flow={flow} onNavigate={onNavigate} />
            ))}
          </div>
        </section>

        <section id="delivery" className="lp-section">
          <SectionHead
            kicker="04 · Engineering delivery"
            title="From streaming reasoning to executable flowsheet."
            lead="Zync ships SFILES 2.0 notation that lab automation systems consume directly, and a known-answer validation suite that proves every number is grounded."
          />
          <div className="lp-showcase">
            <CodePanel title="SFILES 2.0 Flowsheet" badge="lab-ready" lines={SFILES_LINES} />
            <CodePanel
              title="Known-answer validation"
              badge="POST /api/validate"
              lines={[
                { tone: 'dim', text: '$ zync validate --suite nres' },
                { blank: true },
                ...VALIDATION_TESTS.flatMap((test) => [
                  { tone: 'ok', text: `PASS  ${test}` },
                ]),
                { blank: true },
                { tone: 'token', text: '5 of 5 tests grounded' },
                { tone: 'warn', text: '0 hallucinated numbers detected' },
              ]}
              cursor
            />
          </div>
        </section>

        <section id="impact" className="lp-section">
          <SectionHead
            kicker="05 · Quantifiable impact"
            title="Evidence that maps to the 13th Malaysia Plan."
          />
          <div className="lp-stats">
            {STATS.map((stat) => (
              <div key={stat.label} className="lp-stat">
                <span className="lp-stat__value">{stat.value}</span>
                <span className="lp-stat__label">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <FinalCTA onEnterDashboard={onEnterDashboard} onNavigate={onNavigate} />
        <Footer />
      </div>
    </div>
  );
}
