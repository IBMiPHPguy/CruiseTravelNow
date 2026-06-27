from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.constants import BOOKED_CRUISE_STATUSES
from app.models import MarketingCampaign, ProposedCruise, TravelRequest
from app.services.booked_cruise_metrics import cruise_total_commission


@dataclass(frozen=True)
class MarketingCampaignRollupMetrics:
    active_monthly_budget: float
    top_roi_campaign_name: str | None
    top_roi_percent: float | None
    total_attributed_volume: float


def campaign_days_active(campaign: MarketingCampaign, today: date) -> int:
    if campaign.start_date > today:
        return 0
    active_through = today
    if campaign.end_date is not None and campaign.end_date < today:
        active_through = campaign.end_date
    return (active_through - campaign.start_date).days + 1


def campaign_spend_to_date(campaign: MarketingCampaign, today: date) -> Decimal:
    days_active = campaign_days_active(campaign, today)
    if days_active <= 0:
        return Decimal("0")
    daily_spend = Decimal(str(campaign.monthly_spend or 0)) / Decimal("30")
    return daily_spend * days_active


def campaign_roi_percent(*, spend_to_date: Decimal, commission: Decimal) -> float | None:
    if spend_to_date <= 0:
        return None
    return float((commission / spend_to_date) * Decimal("100"))


def is_running_campaign(campaign: MarketingCampaign, today: date) -> bool:
    if campaign.start_date > today:
        return False
    if campaign.end_date is not None and campaign.end_date < today:
        return False
    return True


def _attributed_booked_cruise_rows(db: Session, agency_id: str) -> list[tuple[str, ProposedCruise]]:
    return (
        db.query(TravelRequest.marketing_campaign_id, ProposedCruise)
        .join(
            ProposedCruise,
            ProposedCruise.travel_request_id == TravelRequest.id,
        )
        .filter(
            TravelRequest.agency_id == agency_id,
            TravelRequest.marketing_campaign_id.isnot(None),
            ProposedCruise.agency_id == agency_id,
            ProposedCruise.status.in_(BOOKED_CRUISE_STATUSES),
        )
        .all()
    )


def compute_marketing_campaign_rollup_metrics(db: Session, agency_id: str) -> MarketingCampaignRollupMetrics:
    today = date.today()
    campaigns = (
        db.query(MarketingCampaign)
        .filter(MarketingCampaign.agency_id == agency_id)
        .order_by(MarketingCampaign.start_date.desc(), MarketingCampaign.campaign_name.asc())
        .all()
    )

    volume_by_campaign: dict[str, float] = defaultdict(float)
    commission_by_campaign: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))

    for campaign_id, cruise in _attributed_booked_cruise_rows(db, agency_id):
        if not campaign_id:
            continue
        volume_by_campaign[campaign_id] += float(cruise.cost or 0)
        commission_by_campaign[campaign_id] += cruise_total_commission(cruise)

    active_monthly_budget = sum(
        float(campaign.monthly_spend or 0) for campaign in campaigns if is_running_campaign(campaign, today)
    )
    total_attributed_volume = float(sum(volume_by_campaign.values()))

    top_name: str | None = None
    top_roi: float | None = None

    for campaign in campaigns:
        spend_to_date = campaign_spend_to_date(campaign, today)
        commission = commission_by_campaign.get(campaign.id, Decimal("0"))
        roi = campaign_roi_percent(spend_to_date=spend_to_date, commission=commission)
        if roi is None:
            continue
        if top_roi is None or roi > top_roi or (roi == top_roi and campaign.campaign_name < (top_name or "")):
            top_roi = roi
            top_name = campaign.campaign_name

    return MarketingCampaignRollupMetrics(
        active_monthly_budget=active_monthly_budget,
        top_roi_campaign_name=top_name,
        top_roi_percent=round(top_roi, 1) if top_roi is not None else None,
        total_attributed_volume=total_attributed_volume,
    )
