from datetime import date

import pytest
from fastapi import HTTPException

from app.services.marketing_campaign_service import (
    create_marketing_campaign,
    delete_marketing_campaign,
    list_marketing_campaigns,
)
from app.tenant_constants import DEFAULT_AGENCY_ID


def test_list_marketing_campaigns_scoped_to_agency(db):
    own_campaign = create_marketing_campaign(
        db,
        agency_id=DEFAULT_AGENCY_ID,
        campaign_name="Tenant A Facebook",
        campaign_type="Facebook/Instagram",
        monthly_spend=250,
        start_date=date(2026, 1, 1),
        end_date=None,
    )
    other_agency_id = "00000000-0000-4000-8000-000000000099"

    own_campaigns = list_marketing_campaigns(db, agency_id=DEFAULT_AGENCY_ID, timeframe="all")
    other_campaigns = list_marketing_campaigns(db, agency_id=other_agency_id, timeframe="all")

    assert [campaign.id for campaign in own_campaigns] == [own_campaign.id]
    assert other_campaigns == []


def test_list_marketing_campaigns_active_and_past_filters(db):
    create_marketing_campaign(
        db,
        agency_id=DEFAULT_AGENCY_ID,
        campaign_name="Active Campaign",
        campaign_type="Email Newsletter",
        monthly_spend=75,
        start_date=date(2020, 1, 1),
        end_date=None,
    )
    create_marketing_campaign(
        db,
        agency_id=DEFAULT_AGENCY_ID,
        campaign_name="Past Campaign",
        campaign_type="TV",
        monthly_spend=1000,
        start_date=date(2020, 1, 1),
        end_date=date(2020, 12, 31),
    )

    active = list_marketing_campaigns(db, agency_id=DEFAULT_AGENCY_ID, timeframe="active")
    past = list_marketing_campaigns(db, agency_id=DEFAULT_AGENCY_ID, timeframe="past")

    assert [campaign.campaign_name for campaign in active] == ["Active Campaign"]
    assert [campaign.campaign_name for campaign in past] == ["Past Campaign"]


def test_delete_marketing_campaign_returns_404_for_other_agency(db):
    campaign = create_marketing_campaign(
        db,
        agency_id=DEFAULT_AGENCY_ID,
        campaign_name="Scoped Campaign",
        campaign_type="YouTube",
        monthly_spend=300,
        start_date=date(2026, 3, 1),
        end_date=None,
    )
    other_agency_id = "00000000-0000-4000-8000-000000000099"

    with pytest.raises(HTTPException) as exc_info:
        delete_marketing_campaign(db, agency_id=other_agency_id, campaign_id=campaign.id)

    assert exc_info.value.status_code == 404
