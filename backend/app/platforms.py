"""Platform registry: identifiers and per-platform objective mappings.

Shared code uses the normalized objective *category*. Platform objective strings stay as stored.
Adding Google Ads means adding an entry here and an adapter under app/integrations/google_ads/.
"""

PLATFORMS: dict[str, dict] = {
    "meta": {"label": "Meta Ads", "enabled": True},
    "google_ads": {"label": "Google Ads", "enabled": False},  # Phase 6
}

# Normalized categories used by rankings and labels.
OBJECTIVE_CATEGORIES = {
    "sales": {"label": "Sales", "primary_conversion_type": "purchase"},
    "leads": {"label": "Leads", "primary_conversion_type": "lead"},
    "traffic": {"label": "Traffic", "primary_conversion_type": None},
    "awareness": {"label": "Awareness", "primary_conversion_type": None},
    "engagement": {"label": "Engagement", "primary_conversion_type": None},
    "other": {"label": "Other", "primary_conversion_type": None},
}

# Meta ODAX objective names (Marketing API "objective" field) -> normalized category.
_META_OBJECTIVES = {
    "OUTCOME_SALES": "sales",
    "OUTCOME_LEADS": "leads",
    "OUTCOME_TRAFFIC": "traffic",
    "OUTCOME_AWARENESS": "awareness",
    "OUTCOME_ENGAGEMENT": "engagement",
    "OUTCOME_APP_PROMOTION": "other",
}

_OBJECTIVE_MAPS = {"meta": _META_OBJECTIVES}


def objective_category(platform: str, objective: str | None) -> str:
    if not objective:
        return "other"
    return _OBJECTIVE_MAPS.get(platform, {}).get(objective, "other")


def primary_conversion_type(platform: str, objective: str | None) -> str | None:
    return OBJECTIVE_CATEGORIES[objective_category(platform, objective)]["primary_conversion_type"]
