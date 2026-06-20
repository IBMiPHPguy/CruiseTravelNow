import { CabinHoldReservationDisplay } from "./CabinHoldReservationFields";
import { proposedCruiseToCabinRooms } from "./cabinRooms";
import { formatMoney } from "./cabinPricing";
import type { CabinHoldReservationDisplayLine, CabinHoldReservationIds } from "./cabinHoldReservations";
import CheckIcon from "./CheckIcon";
import EditIcon from "./EditIcon";
import IconTooltip from "./IconTooltip";
import RejectIcon from "./RejectIcon";
import { proposedCruiseStatusClass } from "./proposedCruiseForm";
import { formatProposedCruiseRejectionReason } from "./proposedCruiseRejection";
import {
  canShowRoomAssignPassenger,
  countProposedCruiseAssignedPassengers,
  formatPassengerNames,
  proposedRoomLabel,
} from "./proposedCruiseRooms";
import type { ProposedCruise } from "./types";
import { addDaysToIsoDate, formatDate } from "./utils";

type ProposedCruiseQuoteCardProps = {
  cruise: ProposedCruise;
  cabinsNeeded: number;
  cabinHoldReservationIds: CabinHoldReservationIds;
  showReservationDisplay: boolean;
  reservationLines: CabinHoldReservationDisplayLine[];
  requestPassengerCount: number;
  disabled: boolean;
  statusUpdating?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onEdit: () => void;
};

function formatRoomTitle(
  cabinIndex: number,
  cabinsNeeded: number,
  category: string,
  roomNumber: string,
): string {
  const label = proposedRoomLabel(cabinIndex, cabinsNeeded);
  const number = roomNumber.trim() || "GTY";
  return `${label}: ${category} (${number})`;
}

export default function ProposedCruiseQuoteCard({
  cruise,
  cabinsNeeded,
  cabinHoldReservationIds,
  showReservationDisplay,
  reservationLines,
  requestPassengerCount,
  disabled,
  statusUpdating = false,
  onAccept,
  onReject,
  onEdit,
}: ProposedCruiseQuoteCardProps) {
  const returnDate = addDaysToIsoDate(cruise.departure_date, cruise.number_of_nights);
  const cabinRooms = proposedCruiseToCabinRooms(cruise, cabinsNeeded);
  const totalAssignedPassengers = countProposedCruiseAssignedPassengers(cruise);
  const showQuickAccept = Boolean(onAccept);
  const showQuickReject = Boolean(onReject);
  const rejectionReason = formatProposedCruiseRejectionReason(cruise);

  return (
    <article className="proposed-cruise-quote-card">
      <header className="proposed-cruise-quote-header">
        <div className="proposed-cruise-quote-header-row proposed-cruise-quote-header-row-top">
          <p className="proposed-cruise-quote-shipline">
            <strong>{cruise.cruise_line}</strong>
            <span className="proposed-cruise-quote-shipline-sep" aria-hidden="true">
              •
            </span>
            <span>{cruise.ship}</span>
          </p>

          <div className="proposed-cruise-quote-timeline" aria-label="Cruise dates">
            <time dateTime={cruise.departure_date}>{formatDate(cruise.departure_date)}</time>
            <span className="proposed-cruise-quote-timeline-arrow" aria-hidden="true">
              →
            </span>
            <time dateTime={returnDate}>{formatDate(returnDate)}</time>
          </div>

          <div className="proposed-cruise-quote-header-actions">
            <span className={`proposed-cruise-status ${proposedCruiseStatusClass(cruise.status)}`}>
              {cruise.status}
            </span>
            {showQuickAccept || showQuickReject || !disabled ? (
              <div className="proposed-cruise-quote-quick-actions">
                {showQuickAccept ? (
                  <IconTooltip label="Accept cruise" placement="below" align="end">
                    <button
                      type="button"
                      className="icon-button icon-button-success proposed-cruise-quote-accept"
                      aria-label="Accept cruise"
                      disabled={statusUpdating}
                      onClick={onAccept}
                    >
                      <CheckIcon />
                    </button>
                  </IconTooltip>
                ) : null}
                {showQuickReject ? (
                  <IconTooltip label="Reject cruise" placement="below" align="end">
                    <button
                      type="button"
                      className="icon-button icon-button-danger proposed-cruise-quote-reject"
                      aria-label="Reject cruise"
                      disabled={statusUpdating}
                      onClick={onReject}
                    >
                      <RejectIcon />
                    </button>
                  </IconTooltip>
                ) : null}
                {!disabled ? (
                  <IconTooltip label="Edit quote" placement="below" align="end">
                    <button
                      type="button"
                      className="icon-button proposed-cruise-quote-edit"
                      aria-label="Edit quote"
                      disabled={statusUpdating}
                      onClick={onEdit}
                    >
                      <EditIcon />
                    </button>
                  </IconTooltip>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="proposed-cruise-quote-header-row proposed-cruise-quote-header-row-bottom">
          <p className="proposed-cruise-quote-departure">
            <span>
              Departs: {formatDate(cruise.departure_date)} ({cruise.number_of_nights} Nights)
            </span>
            <span className="proposed-cruise-quote-departure-sep" aria-hidden="true">
              |
            </span>
            <span>{cruise.itinerary_name}</span>
          </p>

          <p className="proposed-cruise-quote-total">
            <span className="proposed-cruise-quote-total-label">Total quote:</span>
            <strong className="proposed-cruise-quote-total-amount">{formatMoney(cruise.cost)}</strong>
          </p>
        </div>

        <p className="proposed-cruise-quote-payment-dates meta">
          Deposit due {formatDate(cruise.deposit_due_date)} · Final payment due{" "}
          {formatDate(cruise.final_payment_due_date)}
        </p>
        {rejectionReason ? (
          <p className="proposed-cruise-quote-rejection-reason meta">
            <span className="proposed-cruise-quote-rejection-reason-label">Rejected reason:</span>{" "}
            {rejectionReason}
          </p>
        ) : null}
      </header>

      <section className="proposed-cruise-quote-rooms" aria-label="Rooms included in this quote">
        <h4 className="proposed-cruise-quote-rooms-title">Rooms included in this quote</h4>

        <div className="proposed-cruise-quote-room-list">
          {cabinRooms.map((room, cabinIndex) => {
            const roomPassengers = cruise.room_passengers?.[cabinIndex] ?? [];
            const passengerNames = formatPassengerNames(roomPassengers);
            const reservationIds = (cabinHoldReservationIds[cabinIndex] ?? [])
              .map((value) => value.trim())
              .filter(Boolean);
            const showAssignPassenger =
              !disabled &&
              canShowRoomAssignPassenger(
                roomPassengers.length,
                totalAssignedPassengers,
                requestPassengerCount,
              );

            return (
              <div className="proposed-cruise-quote-room" key={`${cruise.id}-room-${cabinIndex}`}>
                <p className="proposed-cruise-quote-room-title">
                  <span className="proposed-cruise-quote-room-chip">
                    {formatRoomTitle(cabinIndex, cabinsNeeded, room.room_category, room.room_number)}
                  </span>
                </p>

                <p className="proposed-cruise-quote-room-passengers">
                  <span className="proposed-cruise-quote-room-label">Passengers:</span>
                  {roomPassengers.length > 0 ? (
                    <span className="proposed-cruise-quote-room-passenger-names">{passengerNames}</span>
                  ) : null}
                  {showAssignPassenger ? (
                    <button type="button" className="proposed-cruise-quote-assign" onClick={onEdit}>
                      + Assign passenger
                    </button>
                  ) : roomPassengers.length === 0 ? (
                    <span className="meta">Unassigned</span>
                  ) : null}
                </p>

                <div className="proposed-cruise-quote-room-financials">
                  <span className="proposed-cruise-quote-room-label">Financials:</span>
                  <div className="proposed-cruise-quote-room-financials-values">
                    <span>Deposit: {formatMoney(room.deposit_amount)}</span>
                    <span>Total: {formatMoney(room.cost)}</span>
                    {reservationIds.length > 0 ? (
                      <span className="proposed-cruise-quote-room-financials-reservations">
                        Reservations: {reservationIds.join(", ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showReservationDisplay && reservationLines.length > 0 && cabinsNeeded === 1 ? (
          <CabinHoldReservationDisplay lines={reservationLines} />
        ) : null}
      </section>
    </article>
  );
}
