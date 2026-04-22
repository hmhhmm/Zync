from pydantic import BaseModel, Field
from typing import Optional, List


class DepositProfile(BaseModel):
    location:       str             = Field(...,  description="Site name or GPS coordinates")
    state:          str             = Field(...,  description="Malaysian state e.g. Kelantan, Pahang")
    clay_type:      str             = Field(...,  description="Clay mineral type e.g. laterite, kaolinite")
    ree_grade:      float           = Field(...,  description="REE grade as percentage e.g. 0.08")
    depth_m:        Optional[float] = Field(None, description="Deposit depth in metres")
    area_ha:        Optional[float] = Field(None, description="Site area in hectares")
    iron_oxide_pct: Optional[float] = Field(None, description="Iron oxide content percentage")
    esg_priority:   Optional[str]   = Field("medium", description="ESG priority: low | medium | high")
    esg_notes:      Optional[str]   = Field(None, description="Any specific ESG constraints")
    notes:          Optional[str]   = Field(None, description="Additional operator notes")


class PipelineRequest(BaseModel):
    deposit_profile: DepositProfile
    operator_name:   Optional[str] = Field(None, description="Operator name for report")
    site_conditions: Optional[dict] = Field(default_factory=dict, description="Real site conditions for optimizer")


class DiagnosisRequest(BaseModel):
    ph_readings:    list[float]     = Field(...,  description="pH readings over time")
    temperature:    list[float]     = Field(...,  description="Temperature readings")
    yield_pct:      list[float]     = Field(...,  description="Yield percentage over time")
    operator_notes: Optional[str]   = Field(None, description="Operator notes e.g. rainfall, equipment issues")
    log_image_b64:  Optional[str]   = Field(None, description="Base64 encoded photo of handwritten log")


class ComplianceRequest(BaseModel):
    lixiviant:        str           = Field(...,  description="Lixiviant name")
    concentration_M:  float         = Field(...,  description="Concentration in mol/L")
    pH_range:         str           = Field(...,  description="pH range e.g. 4.0-4.5")
    temperature_C:    int           = Field(...,  description="Temperature in Celsius")
    thorium_risk:     Optional[str] = Field(None, description="Estimated thorium risk level")
    esg_flag:         Optional[bool] = Field(False)
    esg_note:         Optional[str] = Field(None)


class ZoneProfile(BaseModel):
    name:                    str            = Field(...,  description="Zone identifier e.g. Zone A")
    ree_grade_ppm:           float          = Field(...,  description="Total REE grade in ppm")
    hree_proportion_pct:     float          = Field(...,  description="Heavy REE as % of total REE")
    river_proximity_m:       float          = Field(...,  description="Distance to nearest water body in metres")
    road_access:             str            = Field(...,  description="sealed | moderate | forest track")
    distance_to_facility_km: float          = Field(...,  description="Distance to processing plant in km")
    area_ha:                 Optional[float] = Field(None, description="Zone area in hectares")
    notes:                   Optional[str]  = Field(None, description="Additional site notes")


class ZonePrioritisationRequest(BaseModel):
    location: str             = Field(...,  description="Site name e.g. Perak IAC-REE")
    state:    str             = Field(...,  description="Malaysian state")
    zones:    List[ZoneProfile] = Field(...,  description="2 to 5 zone profiles to assess")


class ValidationRequest(BaseModel):
    test_ids: Optional[list[str]] = Field(
        None,
        description="Specific test IDs to run. If null, runs all 5 tests."
    )