import { useState } from 'react';

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  Code2,
  Cpu,
  Globe,
  Gem,
  MapPin,
  MessageCircle,
  Send,
  Sparkles,
  Shield,
  Rocket,
  AtSign,
  TerminalSquare,
  Play,
} from 'lucide-react';

const MODULE_ACTIONS = [
  { label: 'Diagnosis Flow', module: 'diagnosis', icon: FlaskConical },
  { label: 'Lixiviant Selection', module: 'lixiviant', icon: Cpu },
  { label: 'Zone Prioritization', module: 'zone-strategy', icon: MapPin },
];

const DEPLOYMENT_CARDS = [
  {
    title: 'Expertise Gap In Hydrometallurgy',
    text: 'Traditional REE flowsheet design takes months of manual trial-and-error by scarce expert teams.',
    icon: Code2,
  },
  {
    title: 'Autonomous 8-Hour Optimization Loop',
    text: 'GLM-5.1 executes more than 600 design iterations without intervention to compress engineering cycles.',
    icon: Rocket,
  },
  {
    title: 'Scientific Reasoning With SciGLM',
    text: 'College-level scientific and numerical reasoning supports complex yield, cost, and waste trade-offs.',
    icon: Shield,
  },
  {
    title: 'Zync Brain For Malaysia',
    text: 'Keeps data and strategic decisions local so national REE capability grows without foreign lock-in.',
    icon: Sparkles,
  },
];

const AGENTIC_PAGES = [
  {
    title: 'MoE Architecture For Scientific Routing',
    text: 'GLM MoE routes requests to specialized experts for mineralogy, process chemistry, and optimization math while activating only the required parameter set.',
    cta: 'View MoE Details',
  },
  {
    title: '202,000-Token Dark Data Ingestion',
    text: 'Long-context reasoning reads fragmented studies, geological PDFs, and historical reports to surface hidden patterns and decision-ready signals.',
    cta: 'Inspect Context Flow',
  },
  {
    title: 'KARMA + SFILES 2.0 Engineering Delivery',
    text: 'Manager-agent orchestration coordinates specialist tools and exports execution-ready process logic for real operating workflows, not just chat outputs.',
    cta: 'Open Delivery Pipeline',
  },
];

export default function LandingPage({ onEnterDashboard, onNavigate }) {
  const [activePage, setActivePage] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);

  const goToPrevPage = () => {
    setActivePage((prev) => (prev - 1 + AGENTIC_PAGES.length) % AGENTIC_PAGES.length);
  };

  const goToNextPage = () => {
    setActivePage((prev) => (prev + 1) % AGENTIC_PAGES.length);
  };

  const onTouchStart = (event) => {
    setTouchStartX(event.changedTouches[0].clientX);
  };

  const onTouchEnd = (event) => {
    if (touchStartX === null) {
      return;
    }

    const deltaX = event.changedTouches[0].clientX - touchStartX;
    const swipeThreshold = 44;

    if (deltaX > swipeThreshold) {
      goToPrevPage();
    } else if (deltaX < -swipeThreshold) {
      goToNextPage();
    }

    setTouchStartX(null);
  };

  const currentPage = AGENTIC_PAGES[activePage];

  return (
    <div className="lp-page min-h-screen relative">
      <div className="lp-grid-overlay absolute inset-0" />
      <div className="lp-glow lp-glow-top" />
      <div className="lp-glow lp-glow-left" />
      <div className="lp-glow lp-glow-right" />

      <div className="lp-page-wrap relative z-10 space-y-20 sm:space-y-28">
        <section className="lp-hero">
          <header className="lp-nav">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center text-white">
                <TerminalSquare size={16} />
              </div>
              <div className="lp-footer-brand-block">
                <p className="text-xs tracking-[0.16em] font-semibold uppercase">ZYNC</p>
                <p className="text-[10px] tracking-[0.14em] uppercase lp-subtle">Malaysia Agentic Engineering Hub</p>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-7 text-[11px] tracking-[0.14em] uppercase lp-subtle">
              <span>Zync Mission</span>
              <span>Agentic Hub</span>
              <span>Human In Loop</span>
              <span>Impact</span>
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={onEnterDashboard} id="enter-dashboard-btn" className="lp-btn lp-btn-launch">Launch</button>
            </div>
          </header>

          <div className="lp-hero-content">
            <div className="lp-hero-copy">
              <span className="lp-chip">
                <Sparkles size={12} />
                RM 1 Trillion Sovereign Mission
              </span>

              <h1 className="lp-title">
                From Mineral Reserve To Zync REE Engineering Capability.
              </h1>
              <p className="lp-lead">
                NRES identified a technology and commercialization gap in local REE processing. Zync uses GLM-5.1
                agentic engineering so Malaysian teams keep decision autonomy and move from raw export dependence to
                midstream plant architecture.
              </p>

              <div className="lp-hero-actions">
                <button onClick={onEnterDashboard} className="lp-cta-primary">
                  Launch Zync Brain
                  <ArrowUpRight size={16} />
                </button>
                <button className="lp-cta-secondary">
                  <Play size={15} />
                  Read Evidence
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-section-head">
            <h2 className="lp-section-title">Problem Statement And Strategic Solution</h2>
            <p className="lp-lead">
              Malaysia needs hydrometallurgical proficiency and repeatable design intelligence. Zync closes this gap
              through specialized GLM scientific reasoning and autonomous engineering loops.
            </p>
          </div>

          <div className="lp-content-grid lp-section-grid grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 w-full">
            {DEPLOYMENT_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="lp-feature-card">
                  <div className="w-10 h-10 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center text-white/90">
                    <Icon size={18} />
                  </div>
                  <h3 className="lp-card-title text-xl sm:text-2xl font-semibold">{card.title}</h3>
                  <p className="lp-card-copy">{card.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-section-head">
            <h2 className="lp-section-title">Agentic Engineering Hub</h2>
            <p className="lp-lead">
              Mixture-of-Experts routing, long-context reasoning, SFILES 2.0 translation, and KARMA orchestration combine
              into one operating layer for sovereign industrial design delivery.
            </p>
          </div>

          <div className="lp-carousel" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <h3 className="text-3xl font-semibold">{currentPage.title}</h3>
            <p className="lp-card-copy lp-carousel-copy">
              {currentPage.text}
            </p>

            <button className="lp-cta-primary lp-carousel-btn">{currentPage.cta}</button>

            <div className="lp-carousel-controls">
              <button className="lp-icon-btn" onClick={goToPrevPage} aria-label="Previous card">
                <ArrowLeft size={14} />
              </button>
              <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.28em] uppercase lp-subtle">
                {AGENTIC_PAGES.map((_, index) => (
                  <button
                    key={`dot-${index}`}
                    className={`lp-carousel-dot ${index === activePage ? 'is-active' : ''}`}
                    onClick={() => setActivePage(index)}
                    aria-label={`Go to card ${index + 1}`}
                  />
                ))}
              </div>
              <button className="lp-icon-btn" onClick={goToNextPage} aria-label="Next card">
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-section-head">
            <h2 className="lp-section-title">Operational Design: Human In The Loop</h2>
            <p className="lp-lead">
              Built for site engineers and process managers, not data scientists. The system turns operator input into
              explainable actions through three decision-support flows.
            </p>
          </div>

          <div className="lp-content-grid lp-section-grid grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 w-full">
            <div className="lp-showcase-card">
              <p className="text-sm font-semibold">Diagnosis And Lixiviant Reasoning</p>
              <div className="lp-showcase-window-wrap lp-showcase-window">
                <pre className="text-xs text-white/65 leading-7 overflow-auto">
{`INPUTS
- weekly logs: pH, temp, flow, output ppm
- clay type, REE concentration, ESG constraints

AGENTIC ACTION
- causal links to operator notes (rainfall, downtime)
- predicts reaction yields before lab implementation
- proposes corrective actions with reasoning traces`}
                </pre>
              </div>
            </div>

            <div className="lp-showcase-card">
              <p className="text-sm font-semibold">Zone Prioritization And Data Ingestion</p>
              <div className="lp-showcase-window-wrap lp-showcase-window p-5 h-[220px] flex flex-col justify-between">
                <div className="space-y-3 text-white/65 text-sm leading-7">
                  <p>- ranks zones by yield vs ESG and regulatory risk</p>
                  <p>- reads unstructured geological PDFs and auto-fills parameters</p>
                  <p>- roadmap: IoT API feeds for real-time anomaly detection</p>
                </div>
                <div className="w-14 h-14 rounded-xl border border-white/20 bg-white/8 text-white flex items-center justify-center self-end">
                  <Gem size={20} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-final-section">
          <div className="lp-sphere" />

          <div className="lp-final-head">
            <h2 className="lp-section-title">Quantifiable Impact And National Value</h2>
            <p className="lp-lead lp-final-lead">
              Zync is a national infrastructure asset: 89.0% R&D design-time reduction, 14.2% total factor
              productivity uplift, and 95.3% AIME capability for advanced industrial decision intelligence.
            </p>
          </div>

          <div className="lp-final-cta-wrap">
            <button onClick={onEnterDashboard} className="lp-cta-primary lp-final-primary">
              Enter Zync Console
              <ArrowUpRight size={16} />
            </button>

            <div className="lp-final-secondary-grid">
              {MODULE_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.module} onClick={() => onNavigate(action.module)} className="lp-cta-secondary lp-final-secondary">
                    <Icon size={14} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="lp-footer">
          <div className="lp-footer-grid">
            <div>
              <p className="lp-footer-brand">ZYNC</p>
              <p className="lp-footer-copy">Malaysia's decision infrastructure for rare earth engineering and midstream industrial capability.</p>
              <div className="lp-footer-follow lp-subtle">Follow mission updates</div>
              <div className="lp-footer-social mt-3 text-white/72">
                <MessageCircle size={15} />
                <Globe size={15} />
                <Send size={15} />
                <AtSign size={15} />
              </div>
            </div>

            <div>
              <p className="lp-footer-heading">Mission</p>
              <ul className="lp-footer-list">
                <li>Sovereign autonomy</li>
                <li>Technology transfer</li>
                <li>Industrial capability</li>
                <li>Explainable decisions</li>
              </ul>
            </div>

            <div>
              <p className="lp-footer-heading">Core System</p>
              <ul className="lp-footer-list">
                <li>GLM-5.1 reasoning</li>
                <li>SciGLM depth</li>
                <li>SFILES 2.0 delivery</li>
                <li>KARMA orchestration</li>
              </ul>
            </div>

            <div>
              <p className="lp-footer-heading">National Impact</p>
              <ul className="lp-footer-list">
                <li>89.0% faster design</li>
                <li>14.2% TFP uplift</li>
                <li>95.3% AIME benchmark</li>
                <li>13MP alignment</li>
              </ul>
            </div>
          </div>

          <div className="lp-footer-meta mt-9 pt-6 border-t border-white/10 text-xs text-white/45">
            ©2026 Zync. Built for Malaysia's independent REE future.
          </div>
        </footer>
      </div>
    </div>
  );
}
