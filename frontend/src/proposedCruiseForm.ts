import type { ProposedCruise, ProposedCruiseIncludes, ProposedCruiseInput } from "./types";

export function emptyProposedCruiseIncludes(): ProposedCruiseIncludes {
  return {
    drink_package: { included: false, name: "" },
    wifi: { included: false, name: "" },
    tips: false,
    excursion: false,
    excursion_credit: { included: false, amount: null },
    onboard_credit: { included: false, amount: null },
  };
}

export const emptyProposedCruiseForm: ProposedCruiseInput = {
  departure_date: "",
  cruise_line: "",
  ship: "",
  number_of_nights: 7,
  itinerary_name: "",
  room_category: "",
  room_number: "",
  passengers_in_room: 2,
  deposit_amount: 0,
  deposit_due_date: "",
  final_payment_due_date: "",
  cost: 0,
  includes: emptyProposedCruiseIncludes(),
  passenger_ids: [],
};

export function proposedCruiseToForm(cruise: ProposedCruise): ProposedCruiseInput {
  return {
    departure_date: cruise.departure_date,
    cruise_line: cruise.cruise_line,
    ship: cruise.ship,
    number_of_nights: cruise.number_of_nights,
    itinerary_name: cruise.itinerary_name,
    room_category: cruise.room_category,
    room_number: cruise.room_number,
    passengers_in_room: cruise.passengers_in_room,
    deposit_amount: cruise.deposit_amount,
    deposit_due_date: cruise.deposit_due_date,
    final_payment_due_date: cruise.final_payment_due_date,
    cost: cruise.cost,
    includes: {
      drink_package: {
        included: cruise.includes.drink_package.included,
        name: cruise.includes.drink_package.name ?? "",
      },
      wifi: {
        included: cruise.includes.wifi.included,
        name: cruise.includes.wifi.name ?? "",
      },
      tips: cruise.includes.tips,
      excursion: cruise.includes.excursion,
      excursion_credit: {
        included: cruise.includes.excursion_credit.included,
        amount: cruise.includes.excursion_credit.amount ?? null,
      },
      onboard_credit: {
        included: cruise.includes.onboard_credit.included,
        amount: cruise.includes.onboard_credit.amount ?? null,
      },
    },
    passenger_ids: cruise.passengers.map((passenger) => passenger.id),
    status: cruise.status,
  };
}

export function buildProposedCruisePayload(form: ProposedCruiseInput): ProposedCruiseInput {
  return {
    ...form,
    includes: {
      drink_package: {
        included: form.includes.drink_package.included,
        name: form.includes.drink_package.included
          ? form.includes.drink_package.name?.trim() || null
          : null,
      },
      wifi: {
        included: form.includes.wifi.included,
        name: form.includes.wifi.included ? form.includes.wifi.name?.trim() || null : null,
      },
      tips: form.includes.tips,
      excursion: form.includes.excursion,
      excursion_credit: {
        included: form.includes.excursion_credit.included,
        amount: form.includes.excursion_credit.included
          ? form.includes.excursion_credit.amount
          : null,
      },
      onboard_credit: {
        included: form.includes.onboard_credit.included,
        amount: form.includes.onboard_credit.included ? form.includes.onboard_credit.amount : null,
      },
    },
  };
}

export function proposedCruiseStatusClass(status: string): string {
  if (status === "Accepted") {
    return "proposed-cruise-status-accepted";
  }
  if (status === "Rejected") {
    return "proposed-cruise-status-rejected";
  }
  return "proposed-cruise-status-proposed";
}

export function proposedCruiseStatusOptionClass(status: string): string {
  if (status === "Accepted") {
    return "status-option-accepted";
  }
  if (status === "Rejected") {
    return "status-option-declined";
  }
  return "status-option-proposed";
}
