from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from app.constants import PROPOSED_CRUISE_STATUS_DEPOSITED
from app.models import MarketingCampaign, ProposedCruise, TravelRequest
from app.services.agency_rollup_service import refresh_agency_dashboard_rollups
from app.services.marketing_campaign_roi_service import (
    campaign_roi_percent,
    campaign_spend_to_date,
    compute_marketing_campaign_rollup_metrics,
)
from app.tenant_constants import DEFAULT_AGENCY_ID


def test_campaign_spend_to_date_prorates_monthly_spend(db):
    campaign = MarketingCampaign(
        id=str(uuid4()),
        agency_id=DEFAULT_AGENCY_ID,
        campaign_name="Radio",
        campaign_type="Radio",
        monthly_spend=300,
        start_date=date.today() - timedelta(days=29),
        end_date=None,
    )
    spend = campaign_spend_to_date(campaign, date.today())
    assert spend == Decimal("300")


def test_compute_marketing_campaign_rollup_metrics_leaderboard_and_volume(db, test_user):
    campaign_high = MarketingCampaign(
        id="00000000-0000-4000-8000-000000000101",
        agency_id=DEFAULT_AGENCY_ID,
        campaign_name="High ROI Ads",
        campaign_type="Google AdSense",
        monthly_spend=300,
        start_date=date.today() - timedelta(days=29),
        end_date=None,
    )
    campaign_low = MarketingCampaign(
        id="00000000-0000-4000-8000-000000000102",
        agency_id=DEFAULT_AGENCY_ID,
        campaign_name="Low ROI Print",
        campaign_type="Print",
        monthly_spend=600,
        start_date=date.today() - timedelta(days=29),
        end_date=date.today() - timedelta(days=1),
    )
    db.add_all([campaign_high, campaign_low])
    db.flush()

    request_high = TravelRequest(
        agency_id=DEFAULT_AGENCY_ID,
        first_name="High",
        last_name="Lead",
        email="high@example.com",
        phone="5551111111",
        cruise_lines=["Royal Caribbean International"],
        excluded_cruise_lines=[],
        destination="Caribbean",
        destination_details={"caribbean_regions": ["Eastern"]},
        departure_date=date.today() + timedelta(days=60),
        return_date=date.today() + timedelta(days=67),
        cabin_types=["Balcony"],
        passengers=2,
        cabins_needed=1,
        marketing_campaign_id=campaign_high.id,
        created_by_id=test_user.id,
        updated_by_id=test_user.id,
    )
    request_low = TravelRequest(
        agency_id=DEFAULT_AGENCY_ID,
        first_name="Low",
        last_name="Lead",
        email="low@example.com",
        phone="5552222222",
        cruise_lines=["Royal Caribbean International"],
        excluded_cruise_lines=[],
        destination="Caribbean",
        destination_details={"caribbean_regions": ["Western"]},
        departure_date=date.today() + timedelta(days=90),
        return_date=date.today() + timedelta(days=97),
        cabin_types=["Balcony"],
        passengers=2,
        cabins_needed=1,
        marketing_campaign_id=campaign_low.id,
        created_by_id=test_user.id,
        updated_by_id=test_user.id,
    )
    db.add_all([request_high, request_low])
    db.flush()

    db.add_all(
        [
            ProposedCruise(
                agency_id=DEFAULT_AGENCY_ID,
                travel_request_id=request_high.id,
                departure_date=date.today() + timedelta(days=60),
                cruise_line="Royal Caribbean International",
                ship="Wonder",
                number_of_nights=7,
                itinerary_name="Eastern",
                room_category="Balcony",
                room_number="1001",
                passengers_in_room=2,
                deposit_amount=500,
                deposit_due_date=date.today() + timedelta(days=30),
                final_payment_due_date=date.today() + timedelta(days=45),
                cost=5000,
                cabin_rooms=[{"commission": 600}],
                includes={"gratuities": False, "wifi": False, "beverages": False, "insurance": False},
                status=PROPOSED_CRUISE_STATUS_DEPOSITED,
                created_by_id=test_user.id,
                updated_by_id=test_user.id,
            ),
            ProposedCruise(
                agency_id=DEFAULT_AGENCY_ID,
                travel_request_id=request_low.id,
                departure_date=date.today() + timedelta(days=90),
                cruise_line="Royal Caribbean International",
                ship="Oasis",
                number_of_nights=7,
                itinerary_name="Alaska",
                room_category="Balcony",
                room_number="2002",
                passengers_in_room=2,
                deposit_amount=500,
                deposit_due_date=date.today() + timedelta(days=30),
                final_payment_due_date=date.today() + timedelta(days=45),
                cost=2000,
                cabin_rooms=[{"commission": 100}],
                includes={"gratuities": False, "wifi": False, "beverages": False, "insurance": False},
                status=PROPOSED_CRUISE_STATUS_DEPOSITED,
                created_by_id=test_user.id,
                updated_by_id=test_user.id,
            ),
        ]
    )
    db.commit()

    metrics = compute_marketing_campaign_rollup_metrics(db, DEFAULT_AGENCY_ID)

    assert metrics.active_monthly_budget == 300
    assert metrics.total_attributed_volume == 7000
    assert metrics.top_roi_campaign_name == "High ROI Ads"
    assert metrics.top_roi_percent is not None
    assert metrics.top_roi_percent > 0

    high_spend = campaign_spend_to_date(campaign_high, date.today())
    high_roi = campaign_roi_percent(spend_to_date=high_spend, commission=Decimal("600"))
    assert metrics.top_roi_percent == round(float(high_roi), 1)

    rollup = refresh_agency_dashboard_rollups(db, DEFAULT_AGENCY_ID)
    assert rollup.marketing_active_monthly_budget == 300
    assert rollup.marketing_top_roi_campaign_name == "High ROI Ads"
    assert rollup.marketing_total_attributed_volume == 7000
