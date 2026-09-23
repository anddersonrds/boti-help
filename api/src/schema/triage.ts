import { z } from "zod";

import { CATEGORY_IDS, DEPARTMENTS, PRIORITIES } from "../catalog/catalog.js";

export const TRIAGE_STATUSES = ["completo", "incompleto", "fora_do_catalogo"] as const;
export type TriageStatus = (typeof TRIAGE_STATUSES)[number];

export const SOURCES = ["gemini", "mock"] as const;
export type Source = (typeof SOURCES)[number];

export const FALLBACK_REASONS = ["rate_limit", "credencial", "timeout", "rede", "flag_manual"] as const;
export type FallbackReason = (typeof FALLBACK_REASONS)[number];

/**
 * The subset the model is asked to fill. Everything else in the triage payload
 * is derived on the server: routing from the catalog, status and missing
 * questions from the required fields, provenance from the classifier used.
 */
export const ModelSuggestionSchema = z.object({
  categoryId: z.enum(CATEGORY_IDS),
  priority: z.enum(PRIORITIES),
  title: z.string().min(1),
  summary: z.string().min(1),
  fields: z.record(z.string(), z.string()),
  confidence: z.number().min(0).max(1),
});
export type ModelSuggestion = z.infer<typeof ModelSuggestionSchema>;

export const MissingQuestionSchema = z.object({
  field: z.string().min(1),
  question: z.string().min(1),
});
export type MissingQuestion = z.infer<typeof MissingQuestionSchema>;

export const TriageSchema = z.object({
  id: z.string().min(1),
  status: z.enum(TRIAGE_STATUSES),
  categoryId: z.enum(CATEGORY_IDS).nullable(),
  department: z.enum(DEPARTMENTS).nullable(),
  slaHours: z.number().int().positive().nullable(),
  priority: z.enum(PRIORITIES),
  title: z.string(),
  summary: z.string(),
  fields: z.record(z.string(), z.string()),
  missingQuestions: z.array(MissingQuestionSchema),
  confidence: z.number().min(0).max(1),
  source: z.enum(SOURCES),
  fallbackReason: z.enum(FALLBACK_REASONS).nullable(),
});
export type Triage = z.infer<typeof TriageSchema>;

/** Payload the employee accepts, after editing the suggestion in the card. */
export const AcceptedTicketSchema = z.object({
  triageId: z.string().min(1),
  categoryId: z.enum(CATEGORY_IDS),
  priority: z.enum(PRIORITIES),
  title: z.string().min(1),
  summary: z.string().min(1),
  fields: z.record(z.string(), z.string()),
});
export type AcceptedTicket = z.infer<typeof AcceptedTicketSchema>;

/**
 * Gemini accepts a documented subset of JSON Schema in `responseJsonSchema`.
 * Keywords outside that subset are dropped so the request is never rejected
 * for a vocabulary reason.
 */
const UNSUPPORTED_KEYWORDS = new Set([
  "$schema",
  "propertyNames",
  "minLength",
  "maxLength",
  "exclusiveMinimum",
  "exclusiveMaximum",
]);

function toSupportedSubset(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toSupportedSubset);
  if (node === null || typeof node !== "object") return node;

  return Object.fromEntries(
    Object.entries(node as Record<string, unknown>)
      .filter(([key]) => !UNSUPPORTED_KEYWORDS.has(key))
      .map(([key, value]) => [key, toSupportedSubset(value)]),
  );
}

/** Derived from the same Zod schema used to validate the model response. */
export const MODEL_JSON_SCHEMA = toSupportedSubset(z.toJSONSchema(ModelSuggestionSchema));
