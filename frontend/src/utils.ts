import type { TravelRequest } from "./types";

export function formatDestinationSummary(request: TravelRequest): string {
  const details = request.destination_details;
  if (!details) {
    return request.destination;
  }

  const subregions =
    details.caribbean_regions ??
    details.alaska_options ??
    details.asia_regions ??
    details.europe_regions;

  if (subregions?.length) {
    return `${request.destination} (${subregions.join(", ")})`;
  }

  return request.destination;
}

export function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isRequestStale(updatedAt: string): boolean {
  const updated = new Date(updatedAt).getTime();
  const threshold = Date.now() - 3 * 24 * 60 * 60 * 1000;
  return updated < threshold;
}
