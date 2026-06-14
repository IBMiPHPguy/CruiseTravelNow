import type { DestinationDetailField, DestinationDetails } from "./types";
import {
  ALASKA_OPTIONS,
  ASIA_OPTIONS,
  CARIBBEAN_REGIONS,
  EUROPE_REGIONS,
} from "./formOptions";

type DestinationFieldsProps = {
  destination: string;
  details: DestinationDetails;
  onToggleDetail: (field: DestinationDetailField, value: string) => void;
};

type CheckboxSectionProps = {
  label: string;
  field: DestinationDetailField;
  options: readonly string[];
  selected: string[];
  onToggleDetail: (field: DestinationDetailField, value: string) => void;
};

function CheckboxSection({
  label,
  field,
  options,
  selected,
  onToggleDetail,
}: CheckboxSectionProps) {
  return (
    <div className="subsection">
      <span className="field-label">{label}</span>
      <div className="checkbox-group">
        {options.map((option) => (
          <label className="checkbox-inline" key={option}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggleDetail(field, option)}
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function DestinationFields({
  destination,
  details,
  onToggleDetail,
}: DestinationFieldsProps) {
  if (destination === "Caribbean") {
    return (
      <CheckboxSection
        label="Caribbean regions (select all that apply)"
        field="caribbean_regions"
        options={CARIBBEAN_REGIONS}
        selected={details.caribbean_regions ?? []}
        onToggleDetail={onToggleDetail}
      />
    );
  }

  if (destination === "Alaska") {
    return (
      <CheckboxSection
        label="Alaska itineraries (select all that apply)"
        field="alaska_options"
        options={ALASKA_OPTIONS}
        selected={details.alaska_options ?? []}
        onToggleDetail={onToggleDetail}
      />
    );
  }

  if (destination === "Asia") {
    return (
      <CheckboxSection
        label="Asia regions (select all that apply)"
        field="asia_regions"
        options={ASIA_OPTIONS}
        selected={details.asia_regions ?? []}
        onToggleDetail={onToggleDetail}
      />
    );
  }

  if (destination === "Europe") {
    return (
      <CheckboxSection
        label="Europe regions (select all that apply)"
        field="europe_regions"
        options={EUROPE_REGIONS}
        selected={details.europe_regions ?? []}
        onToggleDetail={onToggleDetail}
      />
    );
  }

  return null;
}
