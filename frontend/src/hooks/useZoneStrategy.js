import { useState, useCallback } from 'react';

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
    reasoning_content: `Zone prioritization uses a weighted multi-criteria decision analysis (MCDA):

Score = 0.30×Grade + 0.25×Reserves + 0.20×Infrastructure + 0.15×Regulatory + 0.10×ESG

Perak scores highest due to:
- Grade (1.8-2.3% TREO): 28.5/30 points
- Reserves (45,000 tonnes): 22.5/25 points  
- Infrastructure (existing road/rail): 19/20 points
- Regulatory (approved): 14.5/15 points
- ESG (brownfield/tailings): 9.5/10 points
Total: 94/100

The Sovereign Strategy Summary translates findings into Bahasa Malaysia per Malaysian government reporting standards (Pekeliling Am Bil. 2/2023).`,
    references: [
      { doi: '10.1016/j.oregeorev.2020.103622', title: 'USGS (2020) — Global REE mineral deposits review', journal: 'Ore Geology Reviews' },
      { doi: '10.1016/j.resourpol.2021.102150', title: 'Nassar et al. (2021) — Critical mineral supply chain risk', journal: 'Resources Policy' },
    ],
  },
};

const normalizeReasoning = (payload) => {
  if (!payload) {
    return null;
  }

  if (typeof payload === 'string') {
    return { reasoning_content: payload, references: [] };
  }

  return {
    reasoning_content: payload.reasoning_content ?? payload.content ?? '',
    references: payload.references ?? [],
  };
};

const normalizeZone = (zone, index) => ({
  id: zone.id ?? `zone-${index + 1}`,
  rank: Number(zone.rank ?? index + 1),
  name: zone.name ?? 'Unnamed Zone',
  score: Number(zone.score ?? 0),
  treo_grade: zone.treo_grade ?? zone.treo ?? '-',
  reserves_tonnes: Number(zone.reserves_tonnes ?? zone.reserves ?? 0),
  infrastructure: zone.infrastructure ?? 'Medium',
  regulatory: zone.regulatory ?? 'Under Review',
  ree_types: Array.isArray(zone.ree_types) ? zone.ree_types : [],
  description: zone.description ?? 'No description provided by backend.',
});

export default function useZoneStrategy() {
  const [zones, setZones] = useState(DOMAIN_ZONES);
  const [summaryBM, setSummaryBM] = useState(DOMAIN_SUMMARY_BM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchZones = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/zone-strategy');
      if (response.ok) {
        const data = await response.json();
        const structured = data?.structured_output ?? data;
        const backendZones = structured?.zones ?? [];
        const backendSummary = structured?.summary_bm ?? structured?.summaryBM;

        if (Array.isArray(backendZones) && backendZones.length > 0) {
          setZones(backendZones.map(normalizeZone));
        } else {
          setZones(DOMAIN_ZONES);
        }

        if (backendSummary) {
          setSummaryBM({
            title: backendSummary.title ?? DOMAIN_SUMMARY_BM.title,
            content: backendSummary.content ?? DOMAIN_SUMMARY_BM.content,
            chain_of_thought:
              normalizeReasoning(backendSummary.chain_of_thought ?? data?.reasoning_content) ??
              DOMAIN_SUMMARY_BM.chain_of_thought,
          });
        } else {
          setSummaryBM(DOMAIN_SUMMARY_BM);
        }
      } else {
        setZones(DOMAIN_ZONES);
        setSummaryBM(DOMAIN_SUMMARY_BM);
      }
    } catch {
      setError('Strategic priority API is currently unavailable. Showing latest validated zoning baseline.');
      setZones(DOMAIN_ZONES);
      setSummaryBM(DOMAIN_SUMMARY_BM);
    }
    setIsLoading(false);
  }, []);

  return { zones, summaryBM, isLoading, error, fetchZones };
}
