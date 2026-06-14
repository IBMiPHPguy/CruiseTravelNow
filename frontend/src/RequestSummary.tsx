import type { TravelRequest } from "./types";
import { formatDestinationSummary } from "./utils";

type RequestSummaryProps = {
  request: TravelRequest;
};

export default function RequestSummary({ request }: RequestSummaryProps) {
  return (
    <div className="request-summary">
      <strong>
        {request.first_name} {request.last_name} · {formatDestinationSummary(request)}
      </strong>
      <div className="meta">
        {request.cruise_line} · {request.departure_date} to {request.return_date}
      </div>
    </div>
  );
}
