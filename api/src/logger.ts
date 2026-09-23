import type { Triage } from "./schema/triage.js";

export type LogWriter = (line: string) => void;

/**
 * Emits only the structured outcome of a triage. The employee's free text never
 * reaches this function, and the fields derived from it - title, summary and the
 * field values - are deliberately left out, so no personal data can leak to the log.
 */
export function logTriage(triage: Triage, durationMs: number, write: LogWriter = console.log): void {
  write(
    JSON.stringify({
      event: "triage",
      categoryId: triage.categoryId,
      priority: triage.priority,
      status: triage.status,
      source: triage.source,
      fallbackReason: triage.fallbackReason,
      durationMs,
    }),
  );
}
