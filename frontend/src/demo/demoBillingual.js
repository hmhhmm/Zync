// ---------------------------------------------------------------------------
// Bilingual demo data (English & Malay)
// ---------------------------------------------------------------------------

const EN = {
  DEMO_DIAGNOSIS_REASONING: `I am analyzing process log data to detect anomalies...

STEP 1 — Extract log readings:
  pH: 5.2 → 4.8 → 4.1 → 3.8 → 3.5 → 3.2
  Temperature: 25.0 → 25.5 → 26.0 → 27.0 → 25.0 → 25.0 °C
  Yield: 78.0 → 76.0 → 70.0 → 62.0 → 45.0 → 38.0 %

STEP 2 — Anomaly detection:
  ⚠ pH drop of 1.9 units over 6 days — drastic decline
  ⚠ Yield collapse 51.3% (78% → 38%), strong correlation with pH
  ✓ Temperature stable → not thermal root cause
  Operator note: heavy rainfall overnight on Day 2 recorded

STEP 3 — Root cause analysis:
  pH threshold < 3.8 breached on Day 4 → thorium co-extraction risk (AELB)
  Primary hypothesis: acid mine drainage (AMD) infiltrated process water
  Sulfate ions (SO₄²⁻) from AMD consumed alkalinity → pH crash
  REE precipitation occurs at pH > 5.5 — unrelated, pH too low

STEP 4 — ESG assessment:
  pH 3.2 < AELB radiological safety threshold (3.8) — MANDATORY FLAG
  Thorium solubility increases exponentially below pH 4.0
  Effluent Th risk > 0.1 Bq/g — immediate testing required

STEP 5 — Action plan:
  Immediate: stop leaching circuit, sample effluent for Th analysis
  Short-term: add lime to restore pH 4.5–5.0
  Long-term: seal and waterproof site drainage channels to prevent AMD`,

  DEMO_DIAGNOSIS_RESULT: {
    root_cause: 'Acid Mine Drainage (AMD) Infiltration',
    root_cause_detail: 'Heavy rainfall (Day 2) introduced AMD-bearing sulfate ions into process water, consuming alkalinity and dropping pH from 5.2 to 3.2 over 6 days. This caused REE loss through precipitation and violated AELB thorium co-extraction threshold.',
    confidence: 'HIGH',
    anomaly_at: 'Day 2–3 transition · pH 4.8 → 4.1 (first warning threshold breached)',
    primary_action: 'Stop leaching circuit immediately. Sample effluent for Th concentration. Add lime to restore pH 4.5–5.0 before resuming operation.',
    esg_flag: true,
    esg_note: 'pH 3.2 violates AELB radiological safety threshold (pH 3.8). Thorium co-extraction risk is HIGH. Effluent Th analysis mandatory before resuming operation per AELB Regulation 7(2).',
    next_steps: [
      'Stop leach circuit and sample effluent for Th, Ra-226, U analysis',
      'Add lime solution (CaO) to neutralise to pH 4.5–5.0',
      'Inspect and seal site drainage channels to prevent AMD infiltration',
      'Install continuous pH monitoring with automatic shutdown if pH < 4.0',
      'Notify site AELB officer within 24 hours per radiological incident protocol',
    ],
    confidence_reason: 'HIGH confidence: pH-yield correlation is linear and consistent with AMD dilution model. Operator note confirms rainfall timing aligns with anomaly onset. Temperature stability rules out thermal deactivation as confounding factor.',
    extracted_readings: {
      ph_readings: [5.2, 4.8, 4.1, 3.8, 3.5, 3.2],
      temperature: [25.0, 25.5, 26.0, 27.0, 25.0, 25.0],
      yield_pct: [78.0, 76.0, 70.0, 62.0, 45.0, 38.0],
      source: 'structured sensor data',
    },
  },
};

const BM = {
  DEMO_DIAGNOSIS_REASONING: `Saya menganalisis data log proses untuk mengesan anomali...

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
  Jangka panjang: tutup dan kalis saluran longkang tapak dari AMD`,

  DEMO_DIAGNOSIS_RESULT: {
    root_cause: 'Infiltrasi Saliran Lombong Berasid (AMD)',
    root_cause_detail: 'Hujan lebat (Hari 2) memperkenalkan AMD berion sulfat ke dalam air proses, menggunakan alkaliniti dan menjatuhkan pH dari 5.2 ke 3.2 dalam 6 hari. Ini menyebabkan kehilangan REE akibat pemendakan dan melanggar ambang co-extraction torium AELB.',
    confidence: 'HIGH',
    anomaly_at: 'Peralihan Hari 2–3 · pH 4.8 → 4.1 (ambang amaran pertama dilanggar)',
    primary_action: 'Hentikan litar leaching serta-merta. Sampel effluent untuk kepekatan Th. Tambah kapur untuk memulihkan pH 4.5–5.0 sebelum menyambung semula operasi.',
    esg_flag: true,
    esg_note: 'pH 3.2 melanggar ambang keselamatan radiologi AELB (pH 3.8). Risiko co-extraction torium adalah TINGGI. Analisis Th effluent wajib sebelum dimulakan semula operasi mengikut Peraturan AELB 7(2).',
    next_steps: [
      'Hentikan litar leach dan ambil sampel effluent untuk analisis Th, Ra-226, U',
      'Tambah larutan kapur (CaO) untuk meneutralkan ke pH 4.5–5.0',
      'Periksa dan kalis saluran longkang tapak untuk mencegah peresapan AMD',
      'Pasang pemantauan pH berterusan dengan geganti pematian automatik pada pH < 4.0',
      'Maklumkan pegawai tapak AELB dalam masa 24 jam mengikut protokol insiden radiologi',
    ],
    confidence_reason: 'Keyakinan TINGGI: korelasi pH-hasil adalah linear dan konsisten dengan model pencairan AMD. Catatan pengendali mengesahkan masa kejadian hujan sepadan dengan permulaan anomali. Kestabilan suhu menolak penyahaktifan terma sebagai faktor perancu.',
    extracted_readings: {
      ph_readings: [5.2, 4.8, 4.1, 3.8, 3.5, 3.2],
      temperature: [25.0, 25.5, 26.0, 27.0, 25.0, 25.0],
      yield_pct: [78.0, 76.0, 70.0, 62.0, 45.0, 38.0],
      source: 'structured sensor data',
    },
  },
};

export function getDemoDiagnosisReasoning(language = 'en') {
  return language === 'bm' ? BM.DEMO_DIAGNOSIS_REASONING : EN.DEMO_DIAGNOSIS_REASONING;
}

export function getDemoDiagnosisResult(language = 'en') {
  return language === 'bm' ? BM.DEMO_DIAGNOSIS_RESULT : EN.DEMO_DIAGNOSIS_RESULT;
}

// For backwards compatibility
export const DEMO_DIAGNOSIS_REASONING = EN.DEMO_DIAGNOSIS_REASONING;
export const DEMO_DIAGNOSIS_RESULT = EN.DEMO_DIAGNOSIS_RESULT;