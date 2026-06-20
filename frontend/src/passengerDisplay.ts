import type { RequestPassenger } from "./types";

export function isInactiveClient(passenger: Pick<RequestPassenger, "passenger_is_active">): boolean {
  return passenger.passenger_is_active === false;
}

export function inactiveClientLabel(): string {
  return "Inactive client";
}

export function stripPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function formatDisplayPhone(phone: string | null | undefined): string | null {
  const digits = stripPhoneDigits(phone ?? "");
  if (!digits) {
    return null;
  }

  const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }

  return phone?.trim() || null;
}

export function formatPassengerContact(
  email: string | null | undefined,
  phone: string | null | undefined,
): string | null {
  const parts = [email?.trim(), formatDisplayPhone(phone)].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
