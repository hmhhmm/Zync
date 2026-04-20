def validate_sfiles(sfiles_string: str) -> bool:
    """
    Basic SFILES 2.0 string validation.
    Checks for required notation elements.
    Full parser would use the SFILES 2.0 spec library.
    """
    if not sfiles_string or len(sfiles_string) < 5:
        return False
    # SFILES strings typically contain unit operation codes
    basic_indicators = ["(", ")", "-", "/"]
    return any(ind in sfiles_string for ind in basic_indicators)


def build_sfiles(flowsheet: dict) -> str:
    """
    Build a basic SFILES 2.0 string from flowsheet parameters.
    Format: Feed-(Leach/lixiviant,pH,T)-Solid_Liquid_Sep-REE_Solution
    """
    lixiviant = flowsheet.get("lixiviant", "AS").replace(" ", "_")
    pH        = flowsheet.get("pH_range", "4.0-4.5")
    temp      = flowsheet.get("temperature_C", 25)
    sl_ratio  = flowsheet.get("solid_liquid_ratio", "1:3")

    return (
        f"IAC_Clay_Feed"
        f"-(Heap_Leach/{lixiviant},pH={pH},T={temp}C,SL={sl_ratio})"
        f"-(Solid_Liquid_Separation/filter)"
        f"-(PLS/REE_bearing_solution)"
        f"-(Precipitation/pH_adjust)"
        f"-(REE_Concentrate)"
    )