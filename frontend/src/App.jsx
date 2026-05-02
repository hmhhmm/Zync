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
    activeAgents: [0, 2], // Updated to match your 0 -> 1 -> 2 flow
    pipelineTitle: 'Diagnosis Agent Swarm',
    variant: 'diagnosis',    // Matches the switch case in AgentPipeline
  },
  lixiviant: {
    component: LixiviantModule,
    activeAgents: [0,1,2, 3, 4], // Updated to focus on the optimization loop
    pipelineTitle: 'Optimization Loop',
    variant: 'lixiviant',    // Matches the switch case in AgentPipeline
  },
  'zone-strategy': {
    component: ZoneStrategyModule,
    activeAgents: [0, 1, 2, 3, 4, 6, 5],
    pipelineTitle: 'Prioritization pipeline · Agent 06 Zone Scorer',
    variant: 'zone',         // Matches the switch case in AgentPipeline
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
            {/* The global pipeline now dynamically shifts layout and agents! */}
            <AgentPipeline
              activeIds={moduleConfig.activeAgents}
              title={moduleConfig.pipelineTitle}
              variant={moduleConfig.variant}
            />

            {Object.entries(MODULES).map(([moduleKey, config]) => {
              const ModuleComponent = config.component;
              const isActive = activeModule === moduleKey;
              return (
                <div
                  key={moduleKey}
                  style={{ display: isActive ? 'block' : 'none' }}
                >
                  <ModuleComponent />
                </div>
              );
            })}
          </main>
        </div>
      </div>
    </div>
  );
}