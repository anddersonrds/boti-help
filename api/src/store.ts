import type { AcceptedTicket, Triage } from "./schema/triage.js";

export type Ticket = AcceptedTicket & {
  protocol: string;
  changedFields: string[];
  createdAt: string;
};

/** What the employee can change in the card between the suggestion and the accepted payload. */
const EDITABLE_KEYS = ["categoryId", "priority", "title", "summary"] as const;

function changedFieldsBetween(triage: Triage, accepted: AcceptedTicket): string[] {
  const changed: string[] = EDITABLE_KEYS.filter((key) => accepted[key] !== triage[key]);
  const fieldKeys = new Set([...Object.keys(triage.fields), ...Object.keys(accepted.fields)]);

  for (const key of fieldKeys) {
    if ((triage.fields[key] ?? "") !== (accepted.fields[key] ?? "")) changed.push(key);
  }

  // Sorted so the list, and the ranking built from it, stay deterministic.
  return changed.sort();
}

/**
 * State lives in the process only, per the experiment's scope: it measures a
 * signal within one session and retains nothing.
 */
export function createStore() {
  const triages = new Map<string, Triage>();
  const tickets: Ticket[] = [];
  let sequence = 0;

  return {
    saveTriage(triage: Triage): void {
      triages.set(triage.id, triage);
    },

    /** Undefined when the payload references a triage this process never produced. */
    openTicket(accepted: AcceptedTicket): Ticket | undefined {
      const triage = triages.get(accepted.triageId);
      if (!triage) return undefined;

      sequence += 1;

      const ticket: Ticket = {
        ...accepted,
        protocol: `BOTI-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`,
        changedFields: changedFieldsBetween(triage, accepted),
        createdAt: new Date().toISOString(),
      };
      tickets.push(ticket);

      return ticket;
    },

    triageCount: (): number => triages.size,
    tickets: (): readonly Ticket[] => tickets,
  };
}

export type Store = ReturnType<typeof createStore>;
