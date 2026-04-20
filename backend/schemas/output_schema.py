from pydantic import BaseModel
from typing import Optional


class FlowsheetOutput(BaseModel):
    lixiviant:            str
    concentration_M:      float
    pH_range:             str
    temperature_C:        int
    contact_time_hrs:     float
    predicted_yield_pct:  float
    thorium_risk:         str
    thorium_risk_reason:  str
    esg_flag:             bool
    esg_note:             str
    sfiles_string:        str
    sfiles_valid:         Optional[bool] = None
    confidence:           str
    confidence_reason:    str
    reasoning_steps:      list[dict]
    alternative_option:   Optional[dict] = None


class ComplianceCheck(BaseModel):
    parameter:        str
    proposed_value:   str
    limit:            str
    status:           str   # pass | fail | insufficient_data
    regulation_cited: str
    action_required:  Optional[str] = None


class ComplianceOutput(BaseModel):
    overall_status:    str
    checks:            list[ComplianceCheck]
    critical_failures: int
    warnings:          int
    summary_bm:        str
    summary_en:        str


class ValidationResult(BaseModel):
    test_id:         str
    scenario:        str
    question:        str
    ground_truth:    str
    glm_answer:      str
    status:          str   # pass | fail | edge_case
    source:          str
    notes:           Optional[str] = None