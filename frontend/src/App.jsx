import { useCallback, useEffect, useRef, useState } from 'react';
import LandingPage from './components/landing/LandingPage';
import SovereigntyBar from './components/layout/SovereigntyBar';
import Sidebar from './components/layout/Sidebar';
import SessionContext from './components/layout/SessionContext';
import AgentPipeline from './components/layout/AgentPipeline';
import DiagnosisModule from './modules/diagnosis/DiagnosisModule';
import LixiviantModule from './modules/lixiviant/LixiviantModule';
import ZoneStrategyModule from './modules/zone-strategy/ZoneStrategyModule';

const MODULES = {
  diagnosis: {
    component: DiagnosisModule,
    activeAgents: [0, 2, 5],
    pipelineTitle: 'Diagnosis pipeline · Routing → Reasoning → Report',
  },
  lixiviant: {
    component: LixiviantModule,
    activeAgents: [0, 1, 2, 3, 4, 5],
    pipelineTitle: 'Optimization pipeline · Full 6-agent loop',
  },
  'zone-strategy': {
    component: ZoneStrategyModule,
    activeAgents: [0, 1, 6],
    pipelineTitle: 'Prioritization pipeline · Agent 06 Zone Scorer',
  },
};

export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeModule, setActiveModule] = useState('diagnosis');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timersRef = useRef([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const scheduleTransition = useCallback((delay, callback) => {
    const id = setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      callback();
    }, delay);
    timersRef.current.push(id);
  }, []);

  const handleEnterDashboard = useCallback(() => {
    setIsTransitioning(true);
    scheduleTransition(280, () => {
      setShowDashboard(true);
      setIsTransitioning(false);
    });
  }, [scheduleTransition]);

  const handleNavigate = useCallback((module) => {
    setActiveModule(module);
    setIsTransitioning(true);
    scheduleTransition(260, () => {
      setShowDashboard(true);
      setIsTransitioning(false);
    });
  }, [scheduleTransition]);

  if (!showDashboard) {
    return (
      <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-[0.995]' : 'opacity-100 scale-100'}`}>
        <LandingPage onEnterDashboard={handleEnterDashboard} onNavigate={handleNavigate} />
      </div>
    );
  }

  const moduleConfig = MODULES[activeModule] ?? MODULES.diagnosis;
  const ActiveModule = moduleConfig.component;

  return (
    <div className={`console-shell transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      <div className="atmosphere-grid" />
      <div className="atmosphere-glow atmosphere-glow--top" />
      <div className="atmosphere-glow atmosphere-glow--left" />
      <div className="atmosphere-glow atmosphere-glow--right" />

      <div className="console-wrap">
        <SovereigntyBar />

        <SessionContext />

        <div className="console-layout">
          <Sidebar
            activeModule={activeModule}
            onModuleChange={setActiveModule}
            activeAgents={moduleConfig.activeAgents}
            onReturnToLanding={() => setShowDashboard(false)}
          />

          <main className="grid gap-5 min-w-0">
            <AgentPipeline
              activeIds={moduleConfig.activeAgents}
              title={moduleConfig.pipelineTitle}
            />

            <div key={activeModule} className="animate-[fade-in_0.35s_ease-out_forwards]">
              <ActiveModule />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
