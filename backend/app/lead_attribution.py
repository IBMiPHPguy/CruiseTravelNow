from __future__ import annotations

from sqlalchemy.orm import Session

from app.constants import (
    LEAD_SOURCE_MARKETING_CAMPAIGN,
    LEAD_SOURCE_REFERRAL,
    LEAD_SOURCES,
)
from app.services.agency_service import get_marketing_campaign_for_agency


def normalize_lead_attribution(
    *,
    lead_source: str | None,
    referral_source_name: str | None,
    marketing_campaign_id: str | None,
) -> tuple[str | None, str | None, str | None]:
    if lead_source is None or not str(lead_source).strip():
        return None, None, None

    normalized_source = lead_source.strip()
    if normalized_source not in LEAD_SOURCES:
        raise ValueError("Invalid lead source selected.")

    if normalized_source == LEAD_SOURCE_REFERRAL:
        referral = (referral_source_name or "").strip()
        if not referral:
            raise ValueError("Enter who referred this client.")
        return normalized_source, referral, None

    if normalized_source == LEAD_SOURCE_MARKETING_CAMPAIGN:
        campaign_id = (marketing_campaign_id or "").strip()
        if not campaign_id:
            raise ValueError("Select a marketing campaign.")
        return normalized_source, None, campaign_id

    return normalized_source, None, None


def resolve_lead_attribution_for_agency(
    db: Session,
    *,
    agency_id: str,
    lead_source: str | None,
    referral_source_name: str | None,
    marketing_campaign_id: str | None,
) -> tuple[str | None, str | None, str | None]:
    source, referral, campaign_id = normalize_lead_attribution(
        lead_source=lead_source,
        referral_source_name=referral_source_name,
        marketing_campaign_id=marketing_campaign_id,
    )
    if campaign_id is not None:
        get_marketing_campaign_for_agency(db, campaign_id, agency_id)
    return source, referral, campaign_id
