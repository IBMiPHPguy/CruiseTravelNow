import pytest
from datetime import date

from app.constants import LEAD_SOURCE_MARKETING_CAMPAIGN, LEAD_SOURCE_REFERRAL, LEAD_SOURCE_GOOGLE_SEARCH
from app.lead_attribution import normalize_lead_attribution
from app.models import MarketingCampaign
from app.services.agency_service import get_marketing_campaign_for_agency
from app.tenant_constants import DEFAULT_AGENCY_ID
from fastapi import HTTPException


def test_normalize_lead_attribution_clears_empty_source():
    source, referral, campaign_id = normalize_lead_attribution(
        lead_source="",
        referral_source_name="Someone",
        marketing_campaign_id="00000000-0000-4000-8000-000000000099",
    )

    assert source is None
    assert referral is None
    assert campaign_id is None


def test_normalize_lead_attribution_requires_referral_name():
    with pytest.raises(ValueError, match="Enter who referred this client"):
        normalize_lead_attribution(
            lead_source=LEAD_SOURCE_REFERRAL,
            referral_source_name="  ",
            marketing_campaign_id=None,
        )


def test_normalize_lead_attribution_requires_campaign_id():
    with pytest.raises(ValueError, match="Select a marketing campaign"):
        normalize_lead_attribution(
            lead_source=LEAD_SOURCE_MARKETING_CAMPAIGN,
            referral_source_name=None,
            marketing_campaign_id="",
        )


def test_normalize_lead_attribution_google_search():
    source, referral, campaign_id = normalize_lead_attribution(
        lead_source=LEAD_SOURCE_GOOGLE_SEARCH,
        referral_source_name="ignored",
        marketing_campaign_id="ignored",
    )

    assert source == LEAD_SOURCE_GOOGLE_SEARCH
    assert referral is None
    assert campaign_id is None


def test_get_marketing_campaign_for_agency_returns_404_for_other_tenant(db):
    campaign = MarketingCampaign(
        id="00000000-0000-4000-8000-000000000010",
        agency_id=DEFAULT_AGENCY_ID,
        campaign_name="Spring Radio",
        campaign_type="Radio",
        monthly_spend=500,
        start_date=date(2026, 1, 1),
    )
    db.add(campaign)
    db.commit()

    other_agency_id = "00000000-0000-4000-8000-000000000099"

    with pytest.raises(HTTPException) as exc_info:
        get_marketing_campaign_for_agency(db, campaign.id, other_agency_id)

    assert exc_info.value.status_code == 404
