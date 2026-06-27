import type { MarketingCampaign } from "./types";

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Active campaigns have no end date, or an end date today or in the future. */
export function isActiveMarketingCampaign(campaign: MarketingCampaign, today = todayIsoDate()): boolean {
  if (!campaign.end_date) {
    return true;
  }
  return campaign.end_date >= today;
}

/** End date used when stopping a campaign (never before its start date). */
export function resolveCampaignStopEndDate(campaign: MarketingCampaign, today = todayIsoDate()): string {
  return campaign.start_date > today ? campaign.start_date : today;
}
