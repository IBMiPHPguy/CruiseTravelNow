import { qualifierBadgeClass } from "./qualifierDisplay";

type PassengerQualifierBadgesProps = {
  qualifiers: string[];
};

export default function PassengerQualifierBadges({ qualifiers }: PassengerQualifierBadgesProps) {
  if (qualifiers.length === 0) {
    return <>—</>;
  }

  return (
    <div className="passenger-qualifier-badges">
      {qualifiers.map((qualifier) => (
        <span className={`passenger-qualifier-badge ${qualifierBadgeClass(qualifier)}`} key={qualifier}>
          {qualifier}
        </span>
      ))}
    </div>
  );
}
