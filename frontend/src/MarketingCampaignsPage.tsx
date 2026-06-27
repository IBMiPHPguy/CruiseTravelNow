import { useCallback, useEffect, useMemo, useState } from "react";
import ChickenSwitchModal from "./ChickenSwitchModal";
import EditIcon from "./EditIcon";
import IconTooltip from "./IconTooltip";
import MarketingCampaignModal from "./MarketingCampaignModal";
import StopIcon from "./StopIcon";
import { fetchMarketingCampaignSummary, fetchMarketingCampaigns, updateMarketingCampaign } from "./api";
import { formatMoney } from "./cabinPricing";
import { isActiveMarketingCampaign, resolveCampaignStopEndDate } from "./marketingCampaignStatus";
import type { MarketingCampaign, MarketingCampaignSummary, MarketingCampaignTimeframe } from "./types";
import { formatDate } from "./utils";

function formatDuration(campaign: MarketingCampaign): string {
  const start = formatDate(campaign.start_date);
  const end = campaign.end_date ? formatDate(campaign.end_date) : "Ongoing";
  return `${start} – ${end}`;
}

function formatRoiPercent(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

type PendingStopCampaign = {
  id: string;
  name: string;
  endDate: string;
};

export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [summary, setSummary] = useState<MarketingCampaignSummary | null>(null);
  const [timeframe, setTimeframe] = useState<MarketingCampaignTimeframe>("all");
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);
  const [pendingStop, setPendingStop] = useState<PendingStopCampaign | null>(null);

  const loadPageData = useCallback(async (activeTimeframe: MarketingCampaignTimeframe) => {
    setLoading(true);
    setSummaryLoading(true);
    setError("");
    try {
      const [items, summaryData] = await Promise.all([
        fetchMarketingCampaigns(activeTimeframe),
        fetchMarketingCampaignSummary(),
      ]);
      setCampaigns(items);
      setSummary(summaryData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load marketing campaigns.");
    } finally {
      setLoading(false);
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPageData(timeframe);
  }, [loadPageData, timeframe]);

  const emptyMessage = useMemo(() => {
    if (timeframe === "active") {
      return "No active campaigns match this filter.";
    }
    if (timeframe === "past") {
      return "No past campaigns match this filter.";
    }
    return "No campaigns yet. Click Create campaign to add your first one.";
  }, [timeframe]);

  async function confirmStopCampaign() {
    if (!pendingStop) {
      return;
    }

    setStoppingId(pendingStop.id);
    setError("");
    setMessage("");
    try {
      await updateMarketingCampaign(pendingStop.id, { end_date: pendingStop.endDate });
      setPendingStop(null);
      setMessage("Marketing campaign ended.");
      await loadPageData(timeframe);
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : "Unable to stop campaign.");
    } finally {
      setStoppingId(null);
    }
  }

  function handleCampaignSaved(savedMessage: string) {
    setMessage(savedMessage);
    void loadPageData(timeframe);
  }

  return (
    <section className="marketing-campaigns-page">
      <section className="marketing-campaigns-roi-section" aria-label="Marketing ROI summary">
        <div className="stats-grid marketing-campaigns-roi-grid">
          <article className="stat-card marketing-campaigns-roi-card marketing-campaigns-roi-card--budget">
            <header className="stat-card-header">
              <span className="stat-label">Active Monthly Budget</span>
            </header>
            <div className="stat-card-body">
              <strong className="stat-value">
                {summaryLoading || !summary ? "—" : formatMoney(summary.active_monthly_budget)}
              </strong>
              <span className="stat-hint stat-hint-neutral">Combined monthly spend for running campaigns</span>
            </div>
          </article>

          <article className="stat-card marketing-campaigns-roi-card marketing-campaigns-roi-card--leader">
            <header className="stat-card-header">
              <span className="stat-label">Top ROI Campaign</span>
            </header>
            <div className="stat-card-body">
              <div className="marketing-campaigns-roi-leader-row">
                <strong className="stat-value marketing-campaigns-roi-leader-name">
                  {summaryLoading || !summary?.top_roi_campaign_name
                    ? "—"
                    : summary.top_roi_campaign_name}
                </strong>
                {summary?.top_roi_percent !== null && summary?.top_roi_percent !== undefined ? (
                  <span className="marketing-roi-badge">{formatRoiPercent(summary.top_roi_percent)} ROI</span>
                ) : null}
              </div>
              <span className="stat-hint stat-hint-neutral">Highest commission return on spend to date</span>
            </div>
          </article>

          <article className="stat-card marketing-campaigns-roi-card marketing-campaigns-roi-card--volume">
            <header className="stat-card-header">
              <span className="stat-label">Total Marketing Volume</span>
            </header>
            <div className="stat-card-body">
              <strong className="stat-value">
                {summaryLoading || !summary ? "—" : formatMoney(summary.total_attributed_volume)}
              </strong>
              <span className="stat-hint stat-hint-neutral">Gross booked volume from attributed campaign leads</span>
            </div>
          </article>
        </div>
      </section>

      <section className="card open-requests-table-card marketing-campaigns-ledger-card">
        <header className="open-requests-table-card-header marketing-campaigns-ledger-header">
          <div className="open-requests-table-card-header-main">
            <h2>Campaign ledger</h2>
            <span className="open-requests-table-card-count" aria-label={`${campaigns.length} campaigns`}>
              {campaigns.length}
            </span>
          </div>
          <div className="marketing-campaigns-header-actions">
            <label className="marketing-campaigns-filters">
              Duration
              <select
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value as MarketingCampaignTimeframe)}
              >
                <option value="all">All campaigns</option>
                <option value="active">Active</option>
                <option value="past">Past</option>
              </select>
            </label>
            <button type="button" className="marketing-campaigns-create-button" onClick={() => setCreateModalOpen(true)}>
              Create campaign
            </button>
          </div>
        </header>

        <div className="open-requests-table-card-body">
          {error ? <p className="status error">{error}</p> : null}
          {message ? <p className="status success">{message}</p> : null}

          {loading ? (
            <p>Loading campaigns...</p>
          ) : campaigns.length === 0 ? (
            <p>{emptyMessage}</p>
          ) : (
            <div className="open-requests-table-wrap">
              <table className="open-requests-table marketing-campaigns-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Type</th>
                    <th>Monthly spend</th>
                    <th>Duration</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => {
                    const canStop = isActiveMarketingCampaign(campaign);

                    return (
                      <tr key={campaign.id}>
                        <td>{campaign.campaign_name}</td>
                        <td>{campaign.campaign_type}</td>
                        <td>{formatMoney(campaign.monthly_spend)}</td>
                        <td>{formatDuration(campaign)}</td>
                        <td className="dashboard-table-actions-cell marketing-campaigns-actions-cell">
                          <div className="dashboard-table-actions">
                            <IconTooltip label={`Edit ${campaign.campaign_name}`}>
                              <button
                                type="button"
                                className="icon-button"
                                aria-label={`Edit ${campaign.campaign_name}`}
                                onClick={() => setEditingCampaign(campaign)}
                              >
                                <EditIcon />
                              </button>
                            </IconTooltip>
                            {canStop ? (
                              <IconTooltip label={`Stop ${campaign.campaign_name}`}>
                                <button
                                  type="button"
                                  className="icon-button icon-button-danger"
                                  aria-label={`Stop ${campaign.campaign_name}`}
                                  disabled={stoppingId === campaign.id}
                                  onClick={() =>
                                    setPendingStop({
                                      id: campaign.id,
                                      name: campaign.campaign_name,
                                      endDate: resolveCampaignStopEndDate(campaign),
                                    })
                                  }
                                >
                                  <StopIcon />
                                </button>
                              </IconTooltip>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <MarketingCampaignModal
        open={createModalOpen}
        mode="create"
        campaign={null}
        onClose={() => setCreateModalOpen(false)}
        onSaved={() => handleCampaignSaved("Marketing campaign created.")}
      />

      <MarketingCampaignModal
        open={editingCampaign !== null}
        mode="edit"
        campaign={editingCampaign}
        onClose={() => setEditingCampaign(null)}
        onSaved={() => handleCampaignSaved("Marketing campaign updated.")}
      />

      <ChickenSwitchModal
        open={pendingStop !== null}
        title="Stop marketing campaign?"
        description="This ends the campaign and moves it to your past campaigns. Leads already linked to it will keep their attribution."
        itemName={pendingStop?.name}
        switchLabel="I understand this campaign will be ended."
        confirmLabel="Stop campaign"
        confirmingLabel="Stopping..."
        hint="The campaign stays in your ledger as a past campaign."
        confirming={pendingStop !== null && stoppingId === pendingStop.id}
        onCancel={() => setPendingStop(null)}
        onConfirm={() => void confirmStopCampaign()}
      />
    </section>
  );
}
