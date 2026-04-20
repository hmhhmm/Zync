import json
import os

# Load knowledge base from data file
_KB_PATH = os.path.join(os.path.dirname(__file__), "../../data/lixiviant_kb/lixiviant_kb.json")

def _load_kb() -> list:
    try:
        with open(_KB_PATH) as f:
            return json.load(f)
    except Exception:
        return _FALLBACK_KB


def lookup_lixiviant(
    clay_type: str,
    ree_grade: str,
    esg_priority: str = "medium",
) -> dict:
    """
    Look up lixiviant candidates for a given clay type and REE grade.
    Returns ranked list of options with predicted yield and ESG notes.
    """
    kb = _load_kb()
    clay_lower = clay_type.lower()

    matches = [
        entry for entry in kb
        if any(c in clay_lower for c in entry.get("clay_types", []))
    ]

    if not matches:
        matches = kb  # Return all if no specific match

    # Sort: if ESG is high priority, rank low-risk options first
    if esg_priority == "high":
        matches = sorted(matches, key=lambda x: x.get("esg_risk_score", 5))

    return {
        "candidates":   matches[:4],  # Top 4 options
        "clay_matched": clay_type,
        "total_found":  len(matches),
    }


# GLM function calling tool definition
LIXIVIANT_TOOL_DEFINITION = {
    "type": "function",
    "function": {
        "name":        "lookup_lixiviant",
        "description": (
            "Look up lixiviant candidates from the EarthMind knowledge base "
            "for a given clay type and REE grade. Returns ranked options with "
            "predicted yield ranges and ESG risk scores."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "clay_type": {
                    "type":        "string",
                    "description": "Clay mineral type e.g. kaolinite, halloysite, laterite, smectite",
                },
                "ree_grade": {
                    "type":        "string",
                    "description": "REE grade percentage e.g. 0.08%",
                },
                "esg_priority": {
                    "type":        "string",
                    "enum":        ["low", "medium", "high"],
                    "description": "How much to prioritise ESG/environmental safety in ranking",
                },
            },
            "required": ["clay_type", "ree_grade"],
        },
    },
}


# Fallback KB if file not found
_FALLBACK_KB = [
    {
        "name":             "Ammonium sulfate",
        "formula":          "(NH4)2SO4",
        "clay_types":       ["laterite", "kaolinite", "halloysite", "iac"],
        "concentration_M":  [0.3, 0.5, 0.8],
        "pH_range":         "4.0-4.5",
        "yield_range_pct":  [60, 80],
        "esg_risk_score":   3,
        "esg_note":         "Ammonium discharge requires wastewater treatment per DOE EQA Schedule 10",
        "thorium_risk":     "medium",
        "cost_index":       "low",
    },
    {
        "name":             "Ammonium chloride",
        "formula":          "NH4Cl",
        "clay_types":       ["laterite", "kaolinite"],
        "concentration_M":  [0.5, 1.0],
        "pH_range":         "4.0-5.0",
        "yield_range_pct":  [55, 75],
        "esg_risk_score":   3,
        "esg_note":         "Chloride ions may affect downstream water quality",
        "thorium_risk":     "medium",
        "cost_index":       "low",
    },
    {
        "name":             "Magnesium sulfate",
        "formula":          "MgSO4",
        "clay_types":       ["smectite", "halloysite", "laterite"],
        "concentration_M":  [0.5, 1.0],
        "pH_range":         "4.5-5.5",
        "yield_range_pct":  [45, 65],
        "esg_risk_score":   1,
        "esg_note":         "Lower environmental impact — no ammonium discharge concern",
        "thorium_risk":     "low",
        "cost_index":       "medium",
    },
    {
        "name":             "Sodium sulfate",
        "formula":          "Na2SO4",
        "clay_types":       ["kaolinite", "halloysite"],
        "concentration_M":  [0.5, 1.5],
        "pH_range":         "5.0-6.0",
        "yield_range_pct":  [40, 60],
        "esg_risk_score":   1,
        "esg_note":         "Safest option — minimal environmental impact",
        "thorium_risk":     "low",
        "cost_index":       "medium",
    },
]