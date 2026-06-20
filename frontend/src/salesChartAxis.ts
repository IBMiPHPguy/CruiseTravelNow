export type ChartYAxis = {
  max: number;
  ticks: number[];
};

const MONTH_SHORT_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function buildChartYAxis(maxValue: number, targetIntervals = 4): ChartYAxis {
  if (maxValue <= 0) {
    const step = 250;
    const max = step * targetIntervals;
    return {
      max,
      ticks: Array.from({ length: targetIntervals + 1 }, (_, index) => index * step),
    };
  }

  const paddedMax = maxValue * 1.08;
  const roughStep = paddedMax / targetIntervals;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;

  let niceStep = magnitude;
  if (normalized <= 1) {
    niceStep = magnitude;
  } else if (normalized <= 2) {
    niceStep = 2 * magnitude;
  } else if (normalized <= 5) {
    niceStep = 5 * magnitude;
  } else {
    niceStep = 10 * magnitude;
  }

  const niceMax = Math.ceil(paddedMax / niceStep) * niceStep;
  const tickCount = Math.round(niceMax / niceStep);
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => index * niceStep);

  return { max: niceMax, ticks };
}

export function formatAxisMoney(value: number): string {
  if (value >= 1000) {
    const thousands = value / 1000;
    const formatted = Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1);
    return `$${formatted}k`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function monthShortLabel(month: number): string {
  return MONTH_SHORT_LABELS[month - 1] ?? "";
}

export function buildYearMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
