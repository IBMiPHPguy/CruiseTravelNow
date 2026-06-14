function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function isReturnAfterDeparture(departureDate: string, returnDate: string): boolean {
  if (!departureDate || !returnDate) {
    return true;
  }
  return returnDate > departureDate;
}

export function minimumReturnDate(departureDate: string): string {
  if (!departureDate) {
    return "";
  }
  return addDays(departureDate, 1);
}

type TravelDatesFieldProps = {
  departureDate: string;
  returnDate: string;
  disabled?: boolean;
  onChange: (departureDate: string, returnDate: string) => void;
};

export default function TravelDatesField({
  departureDate,
  returnDate,
  disabled = false,
  onChange,
}: TravelDatesFieldProps) {
  const minReturnDate = minimumReturnDate(departureDate);
  const datesValid = isReturnAfterDeparture(departureDate, returnDate);

  function handleDepartureChange(value: string) {
    let nextReturn = returnDate;
    if (value && nextReturn && nextReturn <= value) {
      nextReturn = addDays(value, 1);
    }
    onChange(value, nextReturn);
  }

  function handleReturnChange(value: string) {
    onChange(departureDate, value);
  }

  return (
    <div className="travel-dates">
      <span className="field-label">Travel dates</span>
      <div className="travel-dates-inputs">
        <label>
          From
          <input
            required
            disabled={disabled}
            type="date"
            value={departureDate}
            onChange={(event) => handleDepartureChange(event.target.value)}
          />
        </label>
        <span className="travel-dates-separator" aria-hidden="true">
          to
        </span>
        <label>
          To
          <input
            required
            disabled={disabled || !departureDate}
            type="date"
            value={returnDate}
            min={minReturnDate || undefined}
            onChange={(event) => handleReturnChange(event.target.value)}
          />
        </label>
      </div>
      {!datesValid ? (
        <p className="field-error">Return date must be after the departure date.</p>
      ) : (
        <p className="field-hint">Select a departure date first, then choose a return date after it.</p>
      )}
    </div>
  );
}
