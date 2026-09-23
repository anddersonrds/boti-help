import type { Store } from "./store.js";

export type CorrectedField = {
  field: string;
  count: number;
};

export type Metrics = {
  totalTriages: number;
  totalTickets: number;
  acceptanceRateWithoutEdits: number | null;
  mostCorrectedFields: CorrectedField[];
};

function byFrequencyThenName(a: CorrectedField, b: CorrectedField): number {
  if (a.count !== b.count) return b.count - a.count;

  // Name breaks the tie so the ranking is the same on every request.
  return a.field < b.field ? -1 : a.field > b.field ? 1 : 0;
}

/** The signal the experiment reports: how often a suggestion was accepted untouched. */
export function buildMetrics(store: Store): Metrics {
  const tickets = store.tickets();
  const withoutEdits = tickets.filter((ticket) => ticket.changedFields.length === 0).length;
  const counts = new Map<string, number>();

  for (const ticket of tickets) {
    for (const field of ticket.changedFields) {
      counts.set(field, (counts.get(field) ?? 0) + 1);
    }
  }

  return {
    totalTriages: store.triageCount(),
    totalTickets: tickets.length,
    // Null, not zero: without a ticket there is no measurement, and zero would read as one.
    acceptanceRateWithoutEdits: tickets.length === 0 ? null : withoutEdits / tickets.length,
    mostCorrectedFields: [...counts.entries()]
      .map(([field, count]) => ({ field, count }))
      .sort(byFrequencyThenName),
  };
}
