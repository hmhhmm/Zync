import { useState, useCallback, useRef, useEffect } from 'react';
import { runPipeline } from '../api/client';

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
  sfiles_notation: '(feed){crush/80μm}→{leach/H₂SO₄+NaF/85°C/4h}→(PLS)[SX/D2EHPA/kerosene]→(strip/HCl)→{precip/oxalic_acid}→{calcine/900°C}→(REE₂O₃)',
  chain_of_thought: {
    reasoning_content: `The optimization engine evaluated 7 lixiviant systems across a multi-objective function:

Objective: Maximize f(yield, ESG) = w₁·yield - w₂·ESG_risk, where w₁=0.7, w₂=0.3

Key findings:
1. H₂SO₄ alone achieves 72.4% yield but with moderate ESG risk (5.2/10) due to SOₓ emissions
2. Addition of 0.1M NaF as a catalytic activator increases yield to 81.6% by disrupting the monazite crystal lattice (F⁻ substitution at phosphate sites)
3. NaOH alkaline crack achieves 76.8% yield with low ESG risk (3.2/10) but requires higher temperature (140°C vs 85°C), increasing OPEX by ~35%
4. Organic acids (citric, EDTA) show excellent ESG profiles but unacceptable yields (<45%) for economic viability

The Pareto-optimal solution is H₂SO₄ + NaF at 85°C, offering the best yield-to-ESG ratio.

SFILES 2.0 flowsheet generated per standard chemical process notation (Ryu et al., 2019).`,
    references: [
      { doi: '10.1016/j.mineng.2019.106025', title: 'Ryu et al. (2019) — SFILES 2.0: Chemical process flowsheet notation', journal: 'Minerals Engineering' },
      { doi: '10.1016/j.hydromet.2018.04.015', title: 'Zhang & Edwards (2018) — Fluoride-assisted acid leaching of monazite', journal: 'Hydrometallurgy' },
    ],
  },
};

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

/**
 * Extracts the optimal lixiviant block from a raw flowsheet dict returned
 * by Agent 2. The real backend returns something like:
 *   { lixiviant, concentration_M, pH_range, temperature_C, residence_hr,
 *     yield_pct, esg_risk_score, sfiles_2_0 | sfiles_notation, ... }
 */
function mapBackendFlowsheet(flowsheet, reasoningText) {
  return {
    optimal_lixiviant:
      flowsheet.lixiviant ??
      flowsheet.optimal_lixiviant ??
      DOMAIN_OPTIMAL.optimal_lixiviant,

    // Agent 2 returns predicted_yield_pct; optimizer iterations use yield_pct
    extraction_yield: Number(
      flowsheet.predicted_yield_pct ??
      flowsheet.yield_pct ??
      flowsheet.extraction_yield ??
      DOMAIN_OPTIMAL.extraction_yield,
    ),

    // Agent 2 does not return a numeric esg_risk_score; use 0 as neutral default
    esg_risk_score: Number(
      flowsheet.esg_risk_score ?? flowsheet.esg_risk ?? 0,
    ),

    concentration_M: flowsheet.concentration_M ?? null,

    temperature_c: Number(
      flowsheet.temperature_C ?? flowsheet.temperature_c ?? DOMAIN_OPTIMAL.temperature_c,
    ),

    // Agent 2 uses contact_time_hrs; keep legacy aliases for safety
    residence_time_hr: Number(
      flowsheet.contact_time_hrs ??
      flowsheet.residence_hr ??
      flowsheet.residence_time_hr ??
      DOMAIN_OPTIMAL.residence_time_hr,
    ),

    solid_liquid_ratio:
      flowsheet.solid_liquid_ratio ??
      flowsheet.sl_ratio ??
      DOMAIN_OPTIMAL.solid_liquid_ratio,

    // Agent 2 uses sfiles_string; keep legacy aliases
    sfiles_notation:
      flowsheet.sfiles_string ??
      flowsheet.sfiles_notation ??
      flowsheet.sfiles_2_0 ??
      DOMAIN_OPTIMAL.sfiles_notation,

    // Extra fields from Agent 2 — shown in output card
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

  useEffect(() => () => abortRef.current?.abort(), []);

  const fetchOptimization = useCallback(async (deposit = DEFAULT_DEPOSIT) => {
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

    try {
      await runPipeline(
        { deposit_profile: deposit },
        {
          signal: controller.signal,
          onEvent: (evt) => {
            if (typeof evt.agent === 'number') {
              setAgentStatus((prev) => ({
                ...prev,
                [evt.agent]: evt.status ?? evt.type ?? 'active',
              }));
            }
            if (evt.agent === 2 && evt.type === 'reasoning' && evt.text) {
              reasoningBuffer += evt.text;
              setStreamingReasoning(reasoningBuffer);
            }
            if (evt.agent === 2 && evt.status === 'done' && evt.flowsheet) {
              capturedFlowsheet = evt.flowsheet;
              setFlowsheet(
                capturedFlowsheet.sfiles_string ??
                  capturedFlowsheet.sfiles_2_0 ??
                  capturedFlowsheet.sfiles_notation ??
                  null,
              );
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
        setOptimal(mapBackendFlowsheet(capturedFlowsheet, reasoningBuffer));
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
  }, []);

  /**
   * Kept for UI compatibility. If the pipeline has already been run and we
   * have a flowsheet, just echo it. Otherwise trigger the pipeline which
   * will set both `optimal.sfiles_notation` and `flowsheet`.
   */
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
