// ---------------------------------------------------------------------------
// All hardcoded GLM-quality demo outputs for offline / recording mode
// ---------------------------------------------------------------------------

// ── Decision 1: Process Diagnosis ──────────────────────────────────────────

export const DEMO_DIAGNOSIS_REASONING = `Saya menganalisis data log proses untuk mengesan anomali...

LANGKAH 1 — Ekstrak bacaan log:
  pH: 5.2 → 4.8 → 4.1 → 3.8 → 3.5 → 3.2
  Suhu: 25.0 → 25.5 → 26.0 → 27.0 → 25.0 → 25.0 °C
  Hasil: 78.0 → 76.0 → 70.0 → 62.0 → 45.0 → 38.0 %

LANGKAH 2 — Pengesanan anomali:
  ⚠ pH jatuh 1.9 unit dalam 6 hari — penurunan drastik
  ⚠ Hasil runtuh 51.3% (78% → 38%), berkorelasi kuat dengan pH
  ✓ Suhu stabil → bukan punca terma
  Catatan pengendali: hujan lebat malam Hari 2 dicatatkan

LANGKAH 3 — Analisis punca akar:
  Ambang pH < 3.8 dilanggar pada Hari 4 → risiko co-extraction torium (AELB)
  Hipotesis utama: saliran lombong berasid (AMD) telah menginfiltrasi air proses
  Ion sulfat (SO₄²⁻) dari AMD menggunakan alkaliniti → pH crash
  Pemendakan REE berlaku pada pH > 5.5 — tidak berkaitan, pH terlalu rendah

LANGKAH 4 — Penilaian ESG:
  pH 3.2 < ambang keselamatan radiologi AELB (3.8) — BENDERA WAJIB
  Kebolehlarutan torium meningkat secara eksponen di bawah pH 4.0
  Risiko effluent Th > 0.1 Bq/g — memerlukan ujian segera

LANGKAH 5 — Pelan tindakan:
  Segera: hentikan litar leaching, sampel effluent untuk analisis Th
  Jangka pendek: tambah kapur untuk memulihkan pH 4.5–5.0
  Jangka panjang: tutup dan kalis saluran longkang tapak dari AMD`;

export const DEMO_DIAGNOSIS_RESULT = {
  root_cause: 'Infiltrasi Saliran Lombong Berasid (AMD)',
  root_cause_detail:
    'Hujan lebat (Hari 2) memperkenalkan AMD berion sulfat ke dalam air proses, menggunakan alkaliniti dan menjatuhkan pH dari 5.2 ke 3.2 dalam 6 hari. Ini menyebabkan kehilangan REE akibat pemendakan dan melanggar ambang co-extraction torium AELB.',
  confidence: 'HIGH',
  anomaly_at: 'Peralihan Hari 2–3 · pH 4.8 → 4.1 (ambang amaran pertama dilanggar)',
  primary_action:
    'Hentikan litar leaching serta-merta. Sampel effluent untuk kepekatan Th. Tambah kapur untuk memulihkan pH 4.5–5.0 sebelum menyambung semula operasi.',
  esg_flag: true,
  esg_note:
    'pH 3.2 melanggar ambang keselamatan radiologi AELB (pH 3.8). Risiko co-extraction torium adalah TINGGI. Analisis Th effluent wajib sebelum dimulakan semula operasi mengikut Peraturan AELB 7(2).',
  next_steps: [
    'Hentikan litar leach dan ambil sampel effluent untuk analisis Th, Ra-226, U',
    'Tambah larutan kapur (CaO) untuk meneutralkan ke pH 4.5–5.0',
    'Periksa dan kalis saluran longkang tapak untuk mencegah peresapan AMD',
    'Pasang pemantauan pH berterusan dengan geganti pematian automatik pada pH < 4.0',
    'Maklumkan pegawai tapak AELB dalam masa 24 jam mengikut protokol insiden radiologi',
  ],
  confidence_reason:
    'Keyakinan TINGGI: korelasi pH-hasil adalah linear dan konsisten dengan model pencairan AMD. Catatan pengendali mengesahkan masa kejadian hujan sepadan dengan permulaan anomali. Kestabilan suhu menolak penyahaktifan terma sebagai faktor perancu.',
  extracted_readings: {
    ph_readings: [5.2, 4.8, 4.1, 3.8, 3.5, 3.2],
    temperature: [25.0, 25.5, 26.0, 27.0, 25.0, 25.0],
    yield_pct: [78.0, 76.0, 70.0, 62.0, 45.0, 38.0],
    source: 'structured sensor data',
  },
};

// ── Decision 2: Lixiviant / Pipeline ───────────────────────────────────────

export const DEMO_PIPELINE_REASONING = `Menganalisis profil deposit Perak Tin Tailings Belt...

PENILAIAN JENIS TANAH LIAT:
  Jenis: laterit (monazit-bearing tailings)
  Gred REE: 0.08 wt% TREO
  Komposisi: Ce 38%, La 27%, Nd 18%, Pr 7%, HREE 10%

PEMILIHAN LIXIVIAN — PENILAIAN 7 SISTEM:
  Fungsi objektif: J(x) = 0.6·Hasil(x) − 0.4·ESG(x)

  1. HCl (3M):          J = 0.6×68.2 − 0.4×6.8 = 40.9 − 2.7 = 38.2  ❌
  2. H₂SO₄ (2M):       J = 0.6×72.4 − 0.4×5.2 = 43.4 − 2.1 = 41.3  ✓
  3. H₂SO₄+NaF (2M):   J = 0.6×81.6 − 0.4×4.1 = 49.0 − 1.6 = 47.3  ★ OPTIMAL
  4. HNO₃ (4M):         J = 0.6×64.1 − 0.4×7.5 = 38.5 − 3.0 = 35.5  ❌
  5. NaOH (40%):        J = 0.6×76.8 − 0.4×3.2 = 46.1 − 1.3 = 44.8  ✓ (OPEX tinggi)
  6. Na₂CO₃ (20%):      J = 0.6×58.3 − 0.4×2.0 = 35.0 − 0.8 = 34.2  ❌
  7. Asid Sitrik (1M):  J = 0.6×42.7 − 0.4×1.2 = 25.6 − 0.5 = 25.1  ❌

KEPUTUSAN:
  H₂SO₄ (2M) + NaF (0.1M) memberikan nisbah hasil-kepada-ESG Pareto-optimum
  NaF sebagai pengaktif katalitik meningkatkan hasil 12.7% dengan merobak kisi kristal monazit
  NaOH mencapai hasil baik tetapi memerlukan suhu 140°C vs 85°C (+35% OPEX)

SFILES 2.0 dijana mengikut standard Ryu et al. (2019)`;

export const DEMO_PIPELINE_FLOWSHEET = {
  lixiviant: 'H₂SO₄ (2M) + NaF (0.1M)',
  concentration_M: 2.0,
  pH_range: '4.2–4.8',
  temperature_C: 85,
  contact_time_hrs: 4,
  solid_liquid_ratio: '1:10',
  predicted_yield_pct: 81.6,
  esg_risk_score: 4.1,
  thorium_risk: 'low',
  thorium_risk_reason:
    'pH 4.2–4.8 menjaga Th dalam bentuk kompleks fosfat yang tidak larut. Effluent Th dijangkakan < 0.02 Bq/g.',
  esg_flag: false,
  confidence: 'HIGH',
  confidence_reason:
    '8 kes sejarah Malaysia (Perak, Pahang) mengesahkan julat hasil 78–85% untuk sistem ini pada laterit monazit.',
  alternative_option: {
    lixiviant: 'NaOH (40%)',
    note: 'Profil ESG lebih baik (3.2/10) tetapi kos operasi 35% lebih tinggi kerana keperluan suhu 140°C.',
  },
  sfiles_string:
    '(suap){hancur/80μm}→{leach/H₂SO₄+NaF/85°C/4h/nisbah_1:10}→(PLS)[SX/D2EHPA/kerosin]→(jalur/HCl)→{mendak/asid_oksalik}→{kalsin/900°C}→(REE₂O₃)',
  references: [
    {
      doi: '10.1016/j.mineng.2019.106025',
      title: 'Ryu et al. (2019) — SFILES 2.0: Chemical process flowsheet notation',
      journal: 'Minerals Engineering',
    },
    {
      doi: '10.1016/j.hydromet.2018.04.015',
      title: 'Zhang & Edwards (2018) — Fluoride-assisted acid leaching of monazite',
      journal: 'Hydrometallurgy',
    },
  ],
};

export const DEMO_ITERATIONS = [
  { iteration: 1,  pH_range: '4.0–5.0', concentration_M: 2.0, temperature_C: 85, contact_time_hrs: 4, yield_pct: 74.2, thorium_ppm: 0.28, status: 'baseline' },
  { iteration: 2,  pH_range: '4.2–4.8', concentration_M: 2.0, temperature_C: 85, contact_time_hrs: 4, yield_pct: 76.1, thorium_ppm: 0.24, status: 'improved' },
  { iteration: 3,  pH_range: '4.2–4.8', concentration_M: 2.2, temperature_C: 85, contact_time_hrs: 4, yield_pct: 77.8, thorium_ppm: 0.22, status: 'improved' },
  { iteration: 4,  pH_range: '4.2–4.8', concentration_M: 2.2, temperature_C: 88, contact_time_hrs: 4, yield_pct: 79.1, thorium_ppm: 0.20, status: 'improved' },
  { iteration: 5,  pH_range: '4.2–4.8', concentration_M: 2.0, temperature_C: 88, contact_time_hrs: 5, yield_pct: 78.5, thorium_ppm: 0.21, status: 'stable' },
  { iteration: 6,  pH_range: '4.0–4.6', concentration_M: 2.2, temperature_C: 88, contact_time_hrs: 4, yield_pct: 80.3, thorium_ppm: 0.19, status: 'improved' },
  { iteration: 7,  pH_range: '4.0–4.6', concentration_M: 2.2, temperature_C: 90, contact_time_hrs: 4, yield_pct: 80.9, thorium_ppm: 0.18, status: 'improved' },
  { iteration: 8,  pH_range: '4.0–4.6', concentration_M: 2.4, temperature_C: 90, contact_time_hrs: 4, yield_pct: 81.1, thorium_ppm: 0.17, status: 'improved' },
  { iteration: 9,  pH_range: '4.0–4.6', concentration_M: 2.4, temperature_C: 90, contact_time_hrs: 3, yield_pct: 79.8, thorium_ppm: 0.19, status: 'stable' },
  { iteration: 10, pH_range: '4.0–4.6', concentration_M: 2.4, temperature_C: 90, contact_time_hrs: 4, yield_pct: 81.3, thorium_ppm: 0.17, status: 'improved' },
  { iteration: 11, pH_range: '4.2–4.8', concentration_M: 2.4, temperature_C: 90, contact_time_hrs: 4, yield_pct: 81.6, thorium_ppm: 0.16, status: 'converged' },
  { iteration: 12, pH_range: '4.2–4.8', concentration_M: 2.4, temperature_C: 90, contact_time_hrs: 4, yield_pct: 81.6, thorium_ppm: 0.16, status: 'converged' },
];

export const DEMO_COMPLIANCE = {
  overall_status: 'pass',
  checks: [
    {
      parameter: 'Kepekatan Torium dalam Effluent',
      proposed_value: '0.016 Bq/g',
      limit: '0.05 Bq/g',
      regulation_cited: 'Peraturan AELB 1986, Jadual III',
      status: 'pass',
      action_required: null,
    },
    {
      parameter: 'Suhu Pelepasan Effluent',
      proposed_value: '35°C (selepas penyejukan)',
      limit: '40°C',
      regulation_cited: 'Jadual Kesepuluh EQA',
      status: 'pass',
      action_required: null,
    },
    {
      parameter: 'pH Effluent',
      proposed_value: '4.5–5.2',
      limit: '6.0–9.0',
      regulation_cited: 'DOE Malaysia EQA 1974, Jadual Pertama',
      status: 'insufficient_data',
      action_required: 'Rawatan peneutral diperlukan sebelum pelepasan. Pasang unit peneutral kapur pada peringkat rawatan effluent.',
    },
    {
      parameter: 'Jarak dari Sungai',
      proposed_value: '850m dari Sungai Perak',
      limit: '500m (EIA wajib < 500m)',
      regulation_cited: 'Garis Panduan Dampak Alam Sekitar DOE 2022',
      status: 'pass',
      action_required: null,
    },
  ],
  summary_en:
    'The proposed H₂SO₄ + NaF process at 85°C passes AELB radiological limits and DOE river proximity thresholds. Effluent pH neutralisation unit required before discharge to meet EQA Schedule 1 targets.',
  summary_bm:
    'Proses H₂SO₄ + NaF yang dicadangkan pada 85°C lulus had radiologi AELB dan ambang jarak sungai DOE. Unit peneutral pH effluent diperlukan sebelum pelepasan bagi memenuhi sasaran EQA Jadual Pertama.',
};

export const DEMO_REPORT = `════════════════════════════════════════════════════════════════
LAPORAN PROSES REE — ZYNC PLATFORM
Tarikh: ${new Date().toLocaleDateString('ms-MY')}   Deposit: Perak Tin Tailings Belt
════════════════════════════════════════════════════════════════

BAHAGIAN 1: CADANGAN LIXIVIAN (EJEN 02)
─────────────────────────────────────────
Lixivian Optimum   : H₂SO₄ (2M) + NaF (0.1M)
Julat pH           : 4.2–4.8
Suhu               : 85°C
Masa Hubungan      : 4 jam
Nisbah P/C         : 1:10
Hasil Dijangka     : 81.6%
Risiko Torium      : RENDAH (0.016 Bq/g — mematuhi AELB)
Keyakinan          : TINGGI

Rasional: Sistem H₂SO₄ + NaF memberikan nisbah Pareto-optimum
antara hasil (81.6%) dan risiko ESG (4.1/10). NaF (0.1M) bertindak
sebagai pengaktif katalitik, mengganggu kisi kristal monazit melalui
penggantian F⁻ di tapak fosfat — meningkatkan hasil sebanyak 12.7%
berbanding H₂SO₄ semata-mata.

BAHAGIAN 2: LOG PENGOPTIMUMAN (EJEN 03)
─────────────────────────────────────────
Jumlah Iterasi: 12   Status: MENUMPU
Hasil Terbaik : 81.6% (Iterasi 11–12)
Parameter Optimum:
  → pH: 4.2–4.8, Kepekatan: 2.4M, Suhu: 90°C, Masa: 4j

BAHAGIAN 3: PENILAIAN PEMATUHAN (EJEN 04)
──────────────────────────────────────────
Status Keseluruhan: LULUS (3/4 semakan lulus, 1 memerlukan tindakan)

✅ AELB 1986 Jadual III       — Th effluent 0.016 Bq/g < had 0.05 Bq/g
✅ EQA Jadual Kesepuluh        — Suhu effluent 35°C < had 40°C
⚠ EQA 1974 Jadual Pertama    — pH effluent memerlukan unit peneutral
✅ DOE EIA Proximity           — 850m > ambang 500m wajib EIA

Tindakan Diperlukan:
  • Pasang unit peneutral kapur pada peringkat rawatan effluent
  • Pantau pH effluent secara berterusan sebelum pelepasan

BAHAGIAN 4: NOTA PROSES SFILES 2.0 (EJEN 02)
───────────────────────────────────────────────
(suap){hancur/80μm}→{leach/H₂SO₄+NaF/85°C/4h/nisbah_1:10}→
(PLS)[SX/D2EHPA/kerosin]→(jalur/HCl)→{mendak/asid_oksalik}→
{kalsin/900°C}→(REE₂O₃)

[Siap untuk automasi makmal — standard SFILES 2.0 (Ryu et al., 2019)]

════════════════════════════════════════════════════════════════
Dijana oleh Zync Platform · Diperkuasa oleh ILMU-GLM-5.1
Untuk kegunaan kejuruteraan sahaja · Bukan nasihat perundangan
════════════════════════════════════════════════════════════════`;

// ── Decision 3: Zone Strategy ───────────────────────────────────────────────

export const DEMO_ZONE_REASONING = `Saya menilai tiga zon mengikut kerangka pemarkahan MCDA Zync...

ANALISIS ZON A (ree_grade=800ppm, hree=45%, river=450m, road=moderate, dist=12km):
  Ekonomi: gred sederhana (800ppm → ~16/30), LREE-dominan
  ESG: jarak sungai 450m → < 500m → EIA wajib → penalti sederhana
  Strategik: HREE 45% — di bawah ambang 60% → tiada premium 13MP
  Infra: jalan sederhana (60/100), jarak 12km → penalti +2

ZON B (ree_grade=1200ppm, hree=65%, river=650m, road=sealed, dist=8km):
  Ekonomi: gred tinggi (1200ppm → 87/100 ekonomi)
  ESG: jarak sungai 650m → melebihi 500m → tiada EIA wajib → skor ESG bersih
  Strategik: HREE 65% > 60% → PREMIUM 13MP aktif (Dy, Y, Tb diutamakan)
  Infra: jalan berturap (90/100), jarak 8km → tiada penalti
  → TERBAIK: skor komposit 84

ZON C (ree_grade=600ppm, hree=30%, river=180m, road=forest track, dist=22km):
  Ekonomi: gred rendah (600ppm → ~10/30)
  ESG: jarak sungai 180m → < 200m → kegagalan pematuhan hampir pasti → DITANGGUHKAN
  Peraturan keras: DOE 200m → zon mesti ditangguhkan
  Infra: jalan hutan (30/100), jarak 22km → penalti tinggi`;

export const DEMO_ZONE_STEPS = `LANGKAH 1 — PEMARKAHAN EKONOMI (30%)
  Zon A: gred 800ppm → skor 68/100 → wajaran 20.4
  Zon B: gred 1200ppm → skor 87/100 → wajaran 26.1  ★
  Zon C: gred 600ppm → skor 52/100 → wajaran 15.6

LANGKAH 2 — RISIKO ESG (25%)
  Zon A: sungai 450m, EIA wajib → skor 71/100 → wajaran 17.75
  Zon B: sungai 650m, tiada EIA → skor 91/100 → wajaran 22.75  ★
  Zon C: sungai 180m → < 200m → KEGAGALAN PASTI → skor 12/100 → wajaran 3.0

LANGKAH 3 — STRATEGIK 13MP HREE (30%)
  Zon A: HREE 45% < 60% → tiada premium → skor 64/100 → wajaran 19.2
  Zon B: HREE 65% > 60% → PREMIUM Dy/Y/Tb aktif → skor 88/100 → wajaran 26.4  ★
  Zon C: HREE 30% → skor 38/100 → wajaran 11.4

LANGKAH 4 — INFRASTRUKTUR (15%)
  Zon A: jalan sederhana, 12km → skor 66/100 → wajaran 9.9
  Zon B: jalan berturap, 8km → skor 95/100 → wajaran 14.25  ★
  Zon C: jalan hutan, 22km → skor 28/100 → wajaran 4.2

LANGKAH 5 — PERINGKAT AKHIR
  Zon B: 26.1 + 22.75 + 26.4 + 14.25 = 84  → DISYORKAN (PELABURAN)
  Zon A: 20.4 + 17.75 + 19.2 + 9.9 = 67   → SEKUNDER
  Zon C: 15.6 + 3.0 + 11.4 + 4.2 = 34     → DITANGGUHKAN (< 200m sungai)`;

export const DEMO_ZONE_RESULT = {
  zones_assessed: 3,
  recommended: {
    zone: 'Zone B',
    composite_score: 84,
    confidence: 'HIGH',
    scores: { economic: 87, esg_risk: 91, strategic: 88, infra: 95 },
    reasoning:
      'Zone B leads on all four dimensions. HREE proportion of 65% (exceeding the 13MP 60% threshold) activates the Dy/Y/Tb strategic premium. River proximity of 650m clears the DOE 500m mandatory-EIA threshold cleanly. Sealed road access and short 8km haul to facility minimise logistics cost.',
    reasoning_bm:
      'Zon B unggul dalam semua empat dimensi penilaian. Perkadaran HREE 65% (melebihi ambang 60% 13MP) mengaktifkan premium strategik Dy/Y/Tb. Jarak sungai 650m melepasi ambang EIA wajib DOE 500m dengan selamat. Akses jalan berturap dan jarak singkat 8km ke kemudahan mengurangkan kos logistik.',
  },
  secondary: {
    zone: 'Zone A',
    composite_score: 67,
    scores: { economic: 68, esg_risk: 71, strategic: 64, infra: 66 },
    reasoning:
      'Zone A is viable as a second-phase investment. River proximity (450m) requires an EIA submission but does not trigger automatic deferral. HREE proportion of 45% does not qualify for the 13MP strategic premium.',
    reasoning_bm:
      'Zon A layak sebagai pelaburan fasa kedua. Jarak sungai (450m) memerlukan penyerahan EIA tetapi tidak mencetuskan penangguhan automatik. Perkadaran HREE 45% tidak layak untuk premium strategik 13MP.',
    reason: 'Viable but subordinate to Zone B on all scoring dimensions.',
    reason_bm: 'Boleh dilaksana tetapi lebih rendah daripada Zon B dalam semua dimensi pemarkahan.',
  },
  deferred: {
    zone: 'Zone C',
    composite_score: 34,
    scores: { economic: 52, esg_risk: 12, strategic: 38, infra: 28 },
    reason:
      'DEFERRED: River proximity 180m is below the 200m hard-rule threshold. Near-certain compliance failure under DOE EIA regulations. Forest track access and 22km haul distance compound the infrastructure penalty.',
    reason_bm:
      'DITANGGUHKAN: Jarak sungai 180m di bawah ambang peraturan keras 200m. Kegagalan pematuhan hampir pasti di bawah peraturan EIA DOE. Akses jalan hutan dan jarak 22km menambahkan penalti infrastruktur.',
  },
  assessment_basis:
    'MCDA weighted scoring: Economic (30%) + ESG Risk (25%) + Strategic/13MP HREE (30%) + Infrastructure (15%). Hard rules: DOE 200m river = mandatory deferral, 500m = EIA required. 13MP HREE premium applied at HREE% > 60%.',
};

// ── Validation suite ────────────────────────────────────────────────────────

export const DEMO_VALIDATION = {
  passed: 4,
  failed: 0,
  edge_cases: 1,
  total: 5,
  results: [
    {
      test_id: 'val_001',
      scenario: 'Perak monazit — kadar hasil asid sulfurik',
      status: 'pass',
    },
    {
      test_id: 'val_002',
      scenario: 'Kelantan IAC — kepekatan ammonium sulfat optimum',
      status: 'pass',
    },
    {
      test_id: 'val_003',
      scenario: 'Kepatuhan AELB — had torium effluent',
      status: 'pass',
    },
    {
      test_id: 'val_004',
      scenario: 'DOE EQA — ambang jarak sungai 500m',
      status: 'pass',
    },
    {
      test_id: 'val_005',
      scenario: 'Pahang laterit — penggabungan NaF pada pH tinggi',
      status: 'edge_case',
    },
  ],
};
