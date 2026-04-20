import json
import os

_RULES_PATH = os.path.join(os.path.dirname(__file__), "../../data/lixiviant_kb/doe_rules.json")

def _load_rules() -> list:
    try:
        with open(_RULES_PATH) as f:
            return json.load(f)
    except Exception:
        return _FALLBACK_RULES


def get_regulations_for_flowsheet(flowsheet: dict) -> list:
    """
    Returns the relevant regulations for a given flowsheet.
    In production: queries Qdrant with hybrid search.
    For MVP: filters static rules based on lixiviant type and pH.
    """
    rules = _load_rules()
    lixiviant = flowsheet.get("lixiviant", "").lower()
    ph_range  = flowsheet.get("pH_range", "")

    relevant = []
    for rule in rules:
        tags = rule.get("tags", [])
        # Always include radioactivity and pH rules
        if "always" in tags:
            relevant.append(rule)
        # Include ammonium rules if ammonium-based lixiviant
        elif "ammonium" in tags and "ammonium" in lixiviant:
            relevant.append(rule)
        # Include low-pH rules if pH goes below 4.0
        elif "low_ph" in tags and _ph_below(ph_range, 4.0):
            relevant.append(rule)

    return relevant


def _ph_below(ph_range: str, threshold: float) -> bool:
    try:
        lower = float(ph_range.split("-")[0].strip())
        return lower < threshold
    except Exception:
        return False


_FALLBACK_RULES = [
    {
        "id":          "AELB-001",
        "body":        "AELB",
        "name":        "Radioactivity limit — processing effluent",
        "parameter":   "thorium_232_bq_per_g",
        "limit":       1.0,
        "unit":        "Bq/g",
        "condition":   "must be below",
        "regulation":  "AELB Regulations 1986, Regulation 26",
        "tags":        ["always", "radioactivity"],
    },
    {
        "id":          "DOE-001",
        "body":        "DOE",
        "name":        "Discharge pH standard",
        "parameter":   "discharge_pH",
        "limit_min":   6.0,
        "limit_max":   9.0,
        "unit":        "pH",
        "condition":   "must be between 6.0 and 9.0",
        "regulation":  "EQA 1974, Schedule 10, Standard B",
        "tags":        ["always", "discharge"],
    },
    {
        "id":          "DOE-002",
        "body":        "DOE",
        "name":        "Ammonium nitrogen discharge limit",
        "parameter":   "ammonium_nitrogen_mg_per_L",
        "limit":       10.0,
        "unit":        "mg/L",
        "condition":   "must be below",
        "regulation":  "EQA 1974, Schedule 10, Standard B, Parameter NH3-N",
        "tags":        ["ammonium", "discharge"],
    },
    {
        "id":          "DOE-003",
        "body":        "DOE",
        "name":        "Total suspended solids",
        "parameter":   "TSS_mg_per_L",
        "limit":       100.0,
        "unit":        "mg/L",
        "condition":   "must be below",
        "regulation":  "EQA 1974, Schedule 10, Standard B",
        "tags":        ["always", "discharge"],
    },
    {
        "id":          "AELB-002",
        "body":        "AELB",
        "name":        "Enhanced thorium risk at low pH",
        "parameter":   "pH_lower_bound",
        "limit":       4.0,
        "unit":        "pH",
        "condition":   "pH below 4.0 significantly increases thorium co-extraction risk",
        "regulation":  "AELB Guidelines for REE Processing, Section 4.2",
        "tags":        ["low_ph", "radioactivity"],
    },
    {
        "id":          "JMG-001",
        "body":        "JMG",
        "name":        "Mineral extraction permit",
        "parameter":   "extraction_permit",
        "limit":       "required",
        "unit":        "permit",
        "condition":   "valid permit must be obtained before operations",
        "regulation":  "Mineral Development Act 1994, Section 14",
        "tags":        ["always", "permit"],
    },
]