import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createMarketingCampaign, updateMarketingCampaign } from "./api";
import { MARKETING_CAMPAIGN_TYPES } from "./formOptions";
import type { MarketingCampaign, MarketingCampaignInput } from "./types";

const emptyCampaignForm = {
  campaign_name: "",
  campaign_type: MARKETING_CAMPAIGN_TYPES[0],
  monthly_spend: "0",
  start_date: "",
  end_date: "",
};

type MarketingCampaignModalMode = "create" | "edit";

type MarketingCampaignModalProps = {
  open: boolean;
  mode: MarketingCampaignModalMode;
  campaign: MarketingCampaign | null;
  onClose: () => void;
  onSaved: () => void;
};

function campaignToForm(campaign: MarketingCampaign) {
  return {
    campaign_name: campaign.campaign_name,
    campaign_type: campaign.campaign_type,
    monthly_spend: String(campaign.monthly_spend),
    start_date: campaign.start_date,
    end_date: campaign.end_date ?? "",
  };
}

export default function MarketingCampaignModal({
  open,
  mode,
  campaign,
  onClose,
  onSaved,
}: MarketingCampaignModalProps) {
  const [form, setForm] = useState(emptyCampaignForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) {
      setForm(emptyCampaignForm);
      setError("");
      setSubmitting(false);
      return;
    }

    if (isEdit && campaign) {
      setForm(campaignToForm(campaign));
      setError("");
      return;
    }

    setForm(emptyCampaignForm);
    setError("");
  }, [open, isEdit, campaign]);

  if (!open) {
    return null;
  }

  if (isEdit && !campaign) {
    return null;
  }

  const formId = isEdit ? "edit-marketing-campaign-form" : "create-marketing-campaign-form";
  const titleId = isEdit ? "edit-marketing-campaign-title" : "create-marketing-campaign-title";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload: MarketingCampaignInput = {
        campaign_name: form.campaign_name.trim(),
        campaign_type: form.campaign_type,
        monthly_spend: Number(form.monthly_spend || 0),
        start_date: form.start_date,
        end_date: form.end_date.trim() || undefined,
      };

      if (isEdit && campaign) {
        await updateMarketingCampaign(campaign.id, {
          ...payload,
          end_date: form.end_date.trim() || null,
        });
      } else {
        await createMarketingCampaign(payload);
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="modal-backdrop modal-backdrop-scroll" role="presentation" onClick={onClose}>
      <div
        className="modal-card marketing-campaign-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-card-header">
          <h3 id={titleId}>{isEdit ? "Edit Campaign" : "Create New Campaign"}</h3>
        </header>

        <form id={formId} className="modal-scroll-body marketing-campaigns-form" onSubmit={(event) => void handleSubmit(event)}>
          {error ? <p className="status error">{error}</p> : null}

          <label>
            Campaign name
            <input
              required
              type="text"
              value={form.campaign_name}
              disabled={submitting}
              onChange={(event) => setForm({ ...form, campaign_name: event.target.value })}
            />
          </label>

          <label>
            Campaign type
            <select
              required
              value={form.campaign_type}
              disabled={submitting}
              onChange={(event) => setForm({ ...form, campaign_type: event.target.value })}
            >
              {MARKETING_CAMPAIGN_TYPES.map((campaignType) => (
                <option key={campaignType} value={campaignType}>
                  {campaignType}
                </option>
              ))}
            </select>
          </label>

          <label>
            Monthly spend
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={form.monthly_spend}
              disabled={submitting}
              onChange={(event) => setForm({ ...form, monthly_spend: event.target.value })}
            />
          </label>

          <div className="field-row">
            <label>
              Start date
              <input
                required
                type="date"
                value={form.start_date}
                disabled={submitting}
                onChange={(event) => setForm({ ...form, start_date: event.target.value })}
              />
            </label>
            <label>
              <span>
                End date <span className="field-optional">(Optional)</span>
              </span>
              <input
                type="date"
                value={form.end_date}
                disabled={submitting}
                onChange={(event) => setForm({ ...form, end_date: event.target.value })}
              />
            </label>
          </div>
        </form>

        <div className="modal-actions modal-actions-footer">
          <button type="button" className="modal-secondary" disabled={submitting} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={formId} disabled={submitting}>
            {submitting ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save changes" : "Create campaign"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
