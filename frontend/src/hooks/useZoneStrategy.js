import { useState, useCallback, useRef, useEffect } from 'react';
import { runValidation, runZonePrioritisation } from '../api/client';
import {
  DEMO_ZONE_REASONING,
  DEMO_ZONE_STEPS,
  DEMO_ZONE_RESULT,
  DEMO_VALIDATION,
} from '../demo/demoData';
import { streamText, delay } from '../demo/demoStream';

const DEMO_MODE = true;

const DOMAIN_ZONES = [
  {
    id: 'perak',
    rank: 1,
    name: 'Perak Tin Tailings Belt',
    score: 94,
    treo_grade: '1.8–2.3%',
    reserves_tonnes: 45000,
    infrastructure: 'High',
    regulatory: 'Approved',
    ree_types: ['Ce', 'La', 'Nd', 'Pr'],
    description: 'Legacy tin mining belt with significant monazite-bearing tailings. Excellent road/rail access. Environmental baseline studies completed.',
    lat: 4.5921,
    lng: 101.0901,
  },
  {
    id: 'pahang',
    rank: 2,
    name: 'Pahang LAMP Corridor',
    score: 88,
    treo_grade: '1.5–2.0%',
    reserves_tonnes: 38000,
    infrastructure: 'High',
    regulatory: 'Conditional',
    ree_types: ['La', 'Ce', 'Nd', 'Y'],
    description: 'Proximity to existing Lynas Advanced Materials Plant. Established supply chain. Conditional approval pending AELB review of Th management.',
    lat: 3.8126,
    lng: 103.3256,
  },
  {
    id: 'terengganu',
    rank: 3,
    name: 'Terengganu Coastal Sands',
    score: 76,
    treo_grade: '0.8–1.2%',
    reserves_tonnes: 28000,
    infrastructure: 'Medium',
    regulatory: 'Under Review',
    ree_types: ['Zr', 'Ti', 'Ce', 'La'],
    description: 'Heavy mineral sand deposits with REE co-products. Lower grade but large volume. Environmental sensitivity due to coastal location.',
    lat: 5.3117,
    lng: 103.1324,
  },
  {
    id: 'sarawak',
    rank: 4,
    name: 'Sarawak Carbonatite Complex',
    score: 71,
    treo_grade: '2.5–4.0%',
    reserves_tonnes: 15000,
    infrastructure: 'Low',
    regulatory: 'Exploration',
    ree_types: ['Nb', 'Ce', 'La', 'Nd'],
    description: 'High-grade primary carbonatite deposit. Significant infrastructure investment required. Remote location in Borneo interior. Strong geological potential.',
    lat: 2.4894,
    lng: 111.8480,
  },
  {
    id: 'johor',
    rank: 5,
    name: 'Johor Xenotime Deposits',
    score: 65,
    treo_grade: '0.5–0.8%',
    reserves_tonnes: 12000,
    infrastructure: 'High',
    regulatory: 'Pre-feasibility',
    ree_types: ['Y', 'Dy', 'Er', 'Yb'],
    description: 'Xenotime-bearing deposits rich in heavy REE (HREE). Strategic importance for Dy/Y supply chain. Near Singapore logistics hub.',
    lat: 1.4854,
    lng: 103.7618,
  },
];

const DOMAIN_SUMMARY_BM = {
  title: 'Ringkasan Strategi Kedaulatan',
  content: `Analisis Z.ai mengesahkan bahawa Malaysia memiliki potensi mineral nadir bumi (REE) yang signifikan bernilai anggaran RM 1 trilion.

Zon Keutamaan Tertinggi: Lembah Tailing Bijih Timah Perak mendapat skor 94/100 berdasarkan gred TREO tinggi (1.8–2.3%), infrastruktur sedia ada, dan kelulusan kawal selia.

Cadangan Strategik:
• Fasa 1: Membangunkan loji pemprosesan perintis di Perak dalam tempoh 18 bulan
• Fasa 2: Mengembangkan ke Koridor LAMP Pahang dengan kerjasama Lynas
• Fasa 3: Pelaburan infrastruktur di Sarawak untuk jangka panjang

Kepatuhan: Semua operasi mematuhi Akta AELB, PDPA, dan garis panduan MCMC untuk kedaulatan data.`,
  chain_of_thought: {
    reasoning_content: `Pemarkahan zon menggunakan analisis keputusan multi-kriteria berwajaran (MCDA):

Skor = 0.30×Ekonomi + 0.25×Risiko ESG + 0.30×Strategik + 0.15×Infrastruktur

Perak mendapat skor tertinggi kerana:
- Gred (1.8-2.3% TREO): 28.5/30 mata
- Rizab (45,000 tan): 22.5/25 mata
- Infrastruktur (jalan/rel sedia ada): 19/20 mata
- Kawal selia (diluluskan): 14.5/15 mata
- ESG (brownfield/tailings): 9.5/10 mata
Jumlah: 94/100

Ringkasan Strategi Kedaulatan menterjemahkan penemuan ke dalam Bahasa Malaysia mengikut piawaian pelaporan kerajaan Malaysia (Pekeliling Am Bil. 2/2023).`,
    references: [
      { doi: '10.1016/j.oregeorev.2020.103622', title: 'USGS (2020) — Global REE mineral deposits review', journal: 'Ore Geology Reviews' },
      { doi: '10.1016/j.resourpol.2021.102150', title: 'Nassar et al. (2021) — Critical mineral supply chain risk', journal: 'Resources Policy' },
    ],
  },
};

function buildZoneCard(entry, rank, isDeferred, inputZones = []) {
  const input = inputZones.find((z) => z.name === entry.zone) ?? {};
  const proximity = input.river_proximity_m;
  const regulatory =
    isDeferred ? 'DEFERRED'
    : proximity != null && proximity < 200 ? 'DEFERRED'
    : proximity != null && proximity < 500 ? 'Conditional'
    : 'Approved';

  return {
    id: entry.zone?.toLowerCase().replace(/\s+/g, '_') ?? `zone_${rank}`,
    rank,
    name: entry.zone ?? `Zone ${rank}`,
    score: entry.composite_score ?? 0,
    scores: entry.scores ?? {},
    treo_grade: input.ree_grade_ppm ? `${(input.ree_grade_ppm / 10000).toFixed(2)}%` : '—',
    reserves_tonnes: 0,
    infrastructure: input.road_access ?? '—',
    regulatory,
    ree_types: input.hree_proportion_pct > 60 ? ['Dy', 'Y', 'Tb'] : ['Ce', 'La', 'Nd'],
    description: entry.reasoning ?? entry.reason ?? '',
    reasoning_bm: entry.reasoning_bm ?? entry.reason_bm ?? '',
    confidence: entry.confidence ?? '',
    deferred: isDeferred,
  };
}

const SAMPLE_INPUT_ZONES = [
  { name: 'Zone A', ree_grade_ppm: 800,  hree_proportion_pct: 45, river_proximity_m: 450, road_access: 'moderate',     distance_to_facility_km: 12 },
  { name: 'Zone B', ree_grade_ppm: 1200, hree_proportion_pct: 65, river_proximity_m: 650, road_access: 'sealed',        distance_to_facility_km: 8  },
  { name: 'Zone C', ree_grade_ppm: 600,  hree_proportion_pct: 30, river_proximity_m: 180, road_access: 'forest track',  distance_to_facility_km: 22 },
];

export default function useZoneStrategy() {
  const [zones, setZones] = useState(DOMAIN_ZONES);
  const [summaryBM, setSummaryBM] = useState(DOMAIN_SUMMARY_BM);
  const [validation, setValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [liveResult, setLiveResult] = useState(null);
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [streamingSteps, setStreamingSteps] = useState('');
  const [agentStatus, setAgentStatus] = useState({});
  const abortRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const _runDemoZones = useCallback(async () => {
    if (!isMounted.current) return;
    setIsLoading(true);
    setError(null);
    setStreamingReasoning('');
    setStreamingSteps('');
    setAgentStatus({});
    setLiveResult(null);

    await delay(1900);
    if (!isMounted.current) return;
    setAgentStatus({ 6: 'reasoning' });

    // Stream reasoning (internal thinking)
    let reasoningBuf = '';
    await streamText(
      DEMO_ZONE_REASONING,
      (chunk) => {
        if (!isMounted.current) return;
        reasoningBuf += chunk;
        setStreamingReasoning(reasoningBuf);
      },
      { chunkSize: 5, delayMs: 18 },
    );

    await delay(700);
    if (!isMounted.current) return;

    // Stream 5-step analysis
    let stepsBuf = '';
    await streamText(
      DEMO_ZONE_STEPS,
      (chunk) => {
        if (!isMounted.current) return;
        stepsBuf += chunk;
        setStreamingSteps(stepsBuf);
      },
      { chunkSize: 6, delayMs: 16 },
    );

    await delay(400);
    if (!isMounted.current) return;

    // Final result
    const result = DEMO_ZONE_RESULT;
    setLiveResult(result);
    setIsLive(true);
    setAgentStatus({ 6: 'done' });

    // Build zone cards from result
    const mapped = [];
    if (result.recommended) mapped.push(buildZoneCard(result.recommended, 1, false, SAMPLE_INPUT_ZONES));
    if (result.secondary)   mapped.push(buildZoneCard(result.secondary,   2, false, SAMPLE_INPUT_ZONES));
    if (result.tertiary)    mapped.push(buildZoneCard(result.tertiary,    3, true, SAMPLE_INPUT_ZONES));
    if (result.rejected) {
      result.rejected.forEach((zone, idx) => {
        mapped.push(buildZoneCard(zone, mapped.length + 1, true, SAMPLE_INPUT_ZONES));
      });
    }
    if (mapped.length > 0) setZones(mapped);

    if (result.recommended) {
      setSummaryBM((prev) => ({
        ...prev,
        title: `Zon Disyorkan: ${result.recommended.zone}`,
        content: result.recommended.reasoning_bm ?? result.recommended.reasoning ?? prev.content,
        chain_of_thought: {
          ...prev.chain_of_thought,
          reasoning_content: reasoningBuf || prev.chain_of_thought.reasoning_content,
        },
      }));
    }

    setIsLoading(false);
  }, []);

  const fetchZones = useCallback(async (request) => {
    if (DEMO_MODE) { await _runDemoZones(); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const SAMPLE_ZONE_REQUEST = {
      location: 'Kelantan IAC-REE Site',
      state: 'Kelantan',
      zones: SAMPLE_INPUT_ZONES,
    };

    setIsLoading(true);
    setError(null);
    setStreamingReasoning('');
    setStreamingSteps('');
    setAgentStatus({});
    setLiveResult(null);

    let reasoningBuffer = '';
    let stepsBuffer = '';

    try {
      await runZonePrioritisation(request ?? SAMPLE_ZONE_REQUEST, {
        signal: controller.signal,
        onEvent: (evt) => {
          if (typeof evt.agent === 'number') {
            setAgentStatus((prev) => ({ ...prev, [evt.agent]: evt.status ?? evt.type ?? 'active' }));
          }
          if (evt.agent === 6 && evt.type === 'reasoning' && evt.text) {
            reasoningBuffer += evt.text;
            setStreamingReasoning(reasoningBuffer);
          }
          if (evt.agent === 6 && evt.type === 'step' && evt.text) {
            stepsBuffer += evt.text;
            setStreamingSteps(stepsBuffer);
          }
          if (evt.agent === 6 && evt.status === 'done' && evt.result) {
            setLiveResult(evt.result);
            setIsLive(true);

            const inputZones = (request ?? SAMPLE_ZONE_REQUEST).zones ?? [];
            const mapped = [];
            if (evt.result.recommended) mapped.push(buildZoneCard(evt.result.recommended, 1, false, inputZones));
            if (evt.result.secondary)   mapped.push(buildZoneCard(evt.result.secondary,   2, false, inputZones));
            if (evt.result.tertiary)    mapped.push(buildZoneCard(evt.result.tertiary,    3, true, inputZones));
            if (evt.result.rejected) {
              evt.result.rejected.forEach((zone, idx) => {
                mapped.push(buildZoneCard(zone, mapped.length + 1, true, inputZones));
              });
            }
            if (mapped.length > 0) setZones(mapped);

            if (evt.result.recommended) {
              setSummaryBM((prev) => ({
                ...prev,
                title: `Zon Disyorkan: ${evt.result.recommended.zone}`,
                content: evt.result.recommended.reasoning_bm ?? evt.result.recommended.reasoning ?? prev.content,
                chain_of_thought: { ...prev.chain_of_thought, reasoning_content: reasoningBuffer || prev.chain_of_thought.reasoning_content },
              }));
            }
          }
        },
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Zone analysis unreachable. Ensure the backend is running.');
        setIsLive(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [_runDemoZones]);

  const runValidationSuite = useCallback(async (testIds = null) => {
    if (DEMO_MODE) {
      setIsValidating(true);
      await delay(2200);
      if (isMounted.current) {
        setValidation(DEMO_VALIDATION);
        setIsValidating(false);
      }
      return DEMO_VALIDATION;
    }

    setIsValidating(true);
    setError(null);
    try {
      const result = await runValidation(testIds);
      setValidation(result);
      return result;
    } catch (err) {
      setError(err.message || 'Validation suite unreachable.');
      setValidation(null);
      return null;
    } finally {
      setIsValidating(false);
    }
  }, []);

  return {
    zones,
    summaryBM,
    validation,
    isValidating,
    isLoading,
    isLive,
    liveResult,
    streamingReasoning,
    streamingSteps,
    agentStatus,
    error,
    fetchZones,
    runValidationSuite,
  };
}
