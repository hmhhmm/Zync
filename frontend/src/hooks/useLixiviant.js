import { useState, useCallback, useRef, useEffect } from 'react';
import { runPipeline } from '../api/client';
import {
  DEMO_PIPELINE_REASONING,
  DEMO_PIPELINE_FLOWSHEET,
  DEMO_ITERATIONS,
  DEMO_COMPLIANCE,
  DEMO_REPORT,
} from '../demo/demoData';
import { streamText, delay } from '../demo/demoStream';

const DEMO_MODE = false;

const DOMAIN_REAGENTS = [
  { id: 'hcl', name: 'HCl (3M)', yield: 68.2, esgRisk: 6.8, temperature: 90, time: 6, class: 'acid', slRatio: '1:8' },
  { id: 'h2so4', name: 'H₂SO₄ (2M)', yield: 72.4, esgRisk: 5.2, temperature: 85, time: 4, class: 'acid', slRatio: '1:10' },
  { id: 'h2so4_naf', name: 'H₂SO₄ (2M) + NaF (0.1M)', yield: 81.6, esgRisk: 4.1, temperature: 85, time: 4, class: 'acid', slRatio: '1:10' },
  { id: 'hno3', name: 'HNO₃ (4M)', yield: 64.1, esgRisk: 7.5, temperature: 70, time: 8, class: 'acid', slRatio: '1:5' },
  { id: 'naoh', name: 'NaOH (40%)', yield: 76.8, esgRisk: 3.2, temperature: 140, time: 4, class: 'alkali', slRatio: '1:6' },
  { id: 'na2co3', name: 'Na₂CO₃ (20%)', yield: 58.3, esgRisk: 2.0, temperature: 160, time: 6, class: 'alkali', slRatio: '1:4' },
  { id: 'citric', name: 'Citric Acid (1M)', yield: 42.7, esgRisk: 1.2, temperature: 50, time: 24, class: 'organic', slRatio: '1:15' },
  { id: 'edta', name: 'EDTA (0.5M)', yield: 38.9, esgRisk: 1.5, temperature: 60, time: 12, class: 'organic', slRatio: '1:20' },
];

const DOMAIN_OPTIMAL = {
  optimal_lixiviant: 'H₂SO₄ (2M) + NaF (0.1M)',
  extraction_yield: 81.6,
  esg_risk_score: 4.1,
  temperature_c: 85,
  residence_time_hr: 4,
  solid_liquid_ratio: '1:10',
  design_speedup: 89,
  sfiles_notation: '(suap){hancur/80μm}→{leach/H₂SO₄+NaF/85°C/4h}→(PLS)[SX/D2EHPA/kerosin]→(jalur/HCl)→{mendak/asid_oksalik}→{kalsin/900°C}→(REE₂O₃)',
  chain_of_thought: {
    reasoning_content: `Fungsi objektif: J(x) = 0.6·Hasil(x) − 0.4·ESG(x)

Penemuan utama:
1. H₂SO₄ sahaja mencapai 72.4% hasil dengan risiko ESG sederhana (5.2/10)
2. Penambahan 0.1M NaF sebagai pengaktif katalitik meningkatkan hasil ke 81.6% dengan mengganggu kisi kristal monazit
3. NaOH alkalin mencapai 76.8% hasil dengan ESG rendah (3.2/10) tetapi memerlukan suhu lebih tinggi (140°C vs 85°C), meningkatkan OPEX ~35%
4. Asid organik (sitrik, EDTA) menunjukkan profil ESG cemerlang tetapi hasil tidak boleh diterima (<45%) untuk kebolehterusan ekonomi

Penyelesaian Pareto-optimum: H₂SO₄ + NaF pada 85°C`,
    references: [
      { doi: '10.1016/j.mineng.2019.106025', title: 'Ryu et al. (2019) — SFILES 2.0: Chemical process flowsheet notation', journal: 'Minerals Engineering' },
      { doi: '10.1016/j.hydromet.2018.04.015', title: 'Zhang & Edwards (2018) — Fluoride-assisted acid leaching of monazite', journal: 'Hydrometallurgy' },
    ],
  },
};

function mapFlowsheet(flowsheet, reasoningText) {
  return {
    optimal_lixiviant: flowsheet.lixiviant ?? DOMAIN_OPTIMAL.optimal_lixiviant,
    extraction_yield: Number(flowsheet.predicted_yield_pct ?? flowsheet.yield_pct ?? DOMAIN_OPTIMAL.extraction_yield),
    esg_risk_score: Number(flowsheet.esg_risk_score ?? 0),
    concentration_M: flowsheet.concentration_M ?? null,
    temperature_c: Number(flowsheet.temperature_C ?? DOMAIN_OPTIMAL.temperature_c),
    residence_time_hr: Number(flowsheet.contact_time_hrs ?? DOMAIN_OPTIMAL.residence_time_hr),
    solid_liquid_ratio: flowsheet.solid_liquid_ratio ?? DOMAIN_OPTIMAL.solid_liquid_ratio,
    sfiles_notation: flowsheet.sfiles_string ?? flowsheet.sfiles_notation ?? DOMAIN_OPTIMAL.sfiles_notation,
    thorium_risk: flowsheet.thorium_risk ?? null,
    thorium_risk_reason: flowsheet.thorium_risk_reason ?? null,
    esg_flag: flowsheet.esg_flag ?? false,
    esg_note: flowsheet.esg_note ?? null,
    confidence: flowsheet.confidence ?? null,
    confidence_reason: flowsheet.confidence_reason ?? null,
    alternative_option: flowsheet.alternative_option ?? null,
    pH_range: flowsheet.pH_range ?? null,
    design_speedup: DOMAIN_OPTIMAL.design_speedup,
    chain_of_thought: {
      reasoning_content: reasoningText || DOMAIN_OPTIMAL.chain_of_thought.reasoning_content,
      references: flowsheet.references ?? DOMAIN_OPTIMAL.chain_of_thought.references,
    },
  };
}

export default function useLixiviant() {
  const [reagents, setReagents] = useState(DOMAIN_REAGENTS);
  const [optimal, setOptimal] = useState(DOMAIN_OPTIMAL);
  const [flowsheet, setFlowsheet] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [agentStatus, setAgentStatus] = useState({});
  const [iterations, setIterations] = useState([]);
  const [iterationsRun, setIterationsRun] = useState(null);
  const [converged, setConverged] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [report, setReport] = useState(null);
  const abortRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const _runDemoOptimization = useCallback(async () => {
    if (!isMounted.current) return;
    setIsLoading(true);
    setError(null);
    setStreamingReasoning('');
    setAgentStatus({});
    setFlowsheet(null);
    setIterations([]);
    setIterationsRun(null);
    setConverged(null);
    setCompliance(null);
    setReport(null);

    // Agent 0 — routing
    await delay(1600);
    if (!isMounted.current) return;
    setAgentStatus({ 0: 'done' });

    // Agent 1 — historian
    await delay(700);
    if (!isMounted.current) return;
    setAgentStatus((p) => ({ ...p, 1: 'done' }));

    // Agent 2 — chemist streaming reasoning
    setAgentStatus((p) => ({ ...p, 2: 'reasoning' }));
    let reasoningBuf = '';
    await streamText(
      DEMO_PIPELINE_REASONING,
      (chunk) => {
        if (!isMounted.current) return;
        reasoningBuf += chunk;
        setStreamingReasoning(reasoningBuf);
      },
      { chunkSize: 5, delayMs: 20 },
    );
    if (!isMounted.current) return;
    setAgentStatus((p) => ({ ...p, 2: 'done' }));
    setFlowsheet(DEMO_PIPELINE_FLOWSHEET.sfiles_string);

    // Agent 3 — optimizer iterations
    setAgentStatus((p) => ({ ...p, 3: 'active' }));
    for (const iter of DEMO_ITERATIONS) {
      if (!isMounted.current) return;
      await delay(480);
      setIterations((prev) => [...prev, iter]);
    }
    if (!isMounted.current) return;
    setIterationsRun(DEMO_ITERATIONS.length);
    setConverged(true);
    setAgentStatus((p) => ({ ...p, 3: 'done' }));

    // Agent 4 — compliance
    await delay(800);
    if (!isMounted.current) return;
    setCompliance(DEMO_COMPLIANCE);
    setAgentStatus((p) => ({ ...p, 4: 'done' }));

    // Agent 5 — report
    await delay(900);
    if (!isMounted.current) return;
    setReport(DEMO_REPORT);
    setAgentStatus((p) => ({ ...p, 5: 'done' }));

    setOptimal(mapFlowsheet(DEMO_PIPELINE_FLOWSHEET, reasoningBuf));
    setReagents(DOMAIN_REAGENTS);
    setIsLive(true);
    setIsLoading(false);
  }, []);

  const fetchOptimization = useCallback(async (deposit) => {
    if (DEMO_MODE) { await _runDemoOptimization(); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setStreamingReasoning('');
    setAgentStatus({});
    setFlowsheet(null);
    setIterations([]);
    setIterationsRun(null);
    setConverged(null);
    setCompliance(null);
    setReport(null);

    let reasoningBuffer = '';
    let capturedFlowsheet = null;

    const DEFAULT_DEPOSIT = {
      location: 'Perak Tin Tailings Belt',
      state: 'Perak',
      clay_type: 'laterite',
      ree_grade: 0.08,
      depth_m: 12,
      area_ha: 340,
      iron_oxide_pct: 6.5,
      esg_priority: 'medium',
      notes: 'Legacy tin tailings; monazite-rich; road + rail access.',
    };

    try {
      await runPipeline(
        { deposit_profile: deposit ?? DEFAULT_DEPOSIT },
        {
          signal: controller.signal,
          onEvent: (evt) => {
            if (typeof evt.agent === 'number') {
              setAgentStatus((prev) => ({ ...prev, [evt.agent]: evt.status ?? evt.type ?? 'active' }));
            }
            if (evt.agent === 2 && evt.type === 'reasoning' && evt.text) {
              reasoningBuffer += evt.text;
              setStreamingReasoning(reasoningBuffer);
            }
            if (evt.agent === 2 && evt.status === 'done' && evt.flowsheet) {
              capturedFlowsheet = evt.flowsheet;
              setFlowsheet(capturedFlowsheet.sfiles_string ?? capturedFlowsheet.sfiles_2_0 ?? capturedFlowsheet.sfiles_notation ?? null);
            }
            if (evt.agent === 3 && evt.type === 'iteration' && evt.iteration) {
              setIterations((prev) => [...prev, evt.iteration]);
            }
            if (evt.agent === 3 && evt.status === 'done') {
              setIterationsRun(evt.iterations_run ?? null);
              setConverged(evt.converged ?? null);
            }
            if (evt.agent === 4 && evt.status === 'done' && evt.compliance) {
              setCompliance(evt.compliance);
            }
            if (evt.agent === 5 && evt.status === 'done' && evt.report) {
              setReport(evt.report);
            }
          },
        },
      );

      if (capturedFlowsheet) {
        setOptimal(mapFlowsheet(capturedFlowsheet, reasoningBuffer));
        setIsLive(true);
      } else {
        setOptimal(DOMAIN_OPTIMAL);
      }
      setReagents(DOMAIN_REAGENTS);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Pipeline unreachable — showing validated baseline scenario.');
      }
      setReagents(DOMAIN_REAGENTS);
      setOptimal(DOMAIN_OPTIMAL);
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, [_runDemoOptimization]);

  const generateFlowsheet = useCallback(async () => {
    if (optimal?.sfiles_notation && !flowsheet) {
      setFlowsheet(optimal.sfiles_notation);
      return;
    }
    if (!isLive) {
      await fetchOptimization();
    } else {
      setFlowsheet(optimal.sfiles_notation);
    }
  }, [optimal, flowsheet, isLive, fetchOptimization]);

  return {
    reagents,
    optimal,
    flowsheet,
    isLoading,
    error,
    isLive,
    streamingReasoning,
    agentStatus,
    iterations,
    iterationsRun,
    converged,
    compliance,
    report,
    fetchOptimization,
    generateFlowsheet,
  };
}
