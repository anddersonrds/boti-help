import { describe, expect, it } from "vitest";

import {
  AcceptedTicketSchema,
  FALLBACK_REASONS,
  MODEL_JSON_SCHEMA,
  ModelSuggestionSchema,
  TriageSchema,
} from "./triage.js";
import { CATEGORY_IDS } from "../catalog/catalog.js";

const validTriage = {
  id: "trg_1",
  status: "completo",
  categoryId: "rh_ferias",
  department: "RH",
  slaHours: 48,
  priority: "media",
  title: "Solicitação de férias em janeiro",
  summary: "Colaborador quer 10 dias de férias a partir de 15 de janeiro.",
  fields: { startDate: "15/01", daysCount: "10" },
  missingQuestions: [],
  confidence: 0.9,
  source: "gemini",
  fallbackReason: null,
};

/** Keywords Gemini documents as supported in responseJsonSchema. */
const SUPPORTED_KEYWORDS = new Set([
  "$id",
  "$defs",
  "$ref",
  "$anchor",
  "type",
  "format",
  "title",
  "description",
  "enum",
  "items",
  "prefixItems",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "anyOf",
  "oneOf",
  "properties",
  "additionalProperties",
  "required",
  "propertyOrdering",
]);

function usedKeywords(node: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) usedKeywords(item, found);
    return found;
  }
  if (node === null || typeof node !== "object") return found;

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    found.add(key);
    if (key !== "properties") usedKeywords(value, found);
    else for (const sub of Object.values(value as Record<string, unknown>)) usedKeywords(sub, found);
  }
  return found;
}

describe("contrato de triagem", () => {
  it("aceita um payload de triagem completo", () => {
    expect(TriageSchema.parse(validTriage)).toEqual(validTriage);
  });

  it("rejeita categoryId fora do catálogo", () => {
    const result = TriageSchema.safeParse({ ...validTriage, categoryId: "rh_inexistente" });

    expect(result.success).toBe(false);
  });

  it("aceita categoryId nulo quando a triagem fica fora do catálogo", () => {
    const result = TriageSchema.safeParse({
      ...validTriage,
      status: "fora_do_catalogo",
      categoryId: null,
      department: null,
      slaHours: null,
      missingQuestions: [],
    });

    expect(result.success).toBe(true);
  });

  it("restringe fallbackReason aos cinco valores previstos", () => {
    expect([...FALLBACK_REASONS]).toEqual(["rate_limit", "credencial", "timeout", "rede", "flag_manual"]);

    for (const reason of FALLBACK_REASONS) {
      expect(TriageSchema.safeParse({ ...validTriage, source: "mock", fallbackReason: reason }).success).toBe(true);
    }

    expect(TriageSchema.safeParse({ ...validTriage, fallbackReason: "quota" }).success).toBe(false);
  });

  it("rejeita chamado com categoria fora do catálogo", () => {
    const result = AcceptedTicketSchema.safeParse({
      triageId: "trg_1",
      categoryId: "rh_inexistente",
      priority: "media",
      title: "t",
      summary: "r",
      fields: {},
    });

    expect(result.success).toBe(false);
  });
});

describe("schema enviado ao modelo", () => {
  it("carrega o enum de ids do catálogo", () => {
    const schema = MODEL_JSON_SCHEMA as { properties: { categoryId: { enum: string[] } } };

    expect(schema.properties.categoryId.enum).toEqual([...CATEGORY_IDS]);
  });

  it("deriva as mesmas chaves do schema Zod usado na validação", () => {
    const schema = MODEL_JSON_SCHEMA as { properties: Record<string, unknown>; required: string[] };
    const zodKeys = Object.keys(ModelSuggestionSchema.shape);

    expect(Object.keys(schema.properties)).toEqual(zodKeys);
    expect(schema.required).toEqual(zodKeys);
  });

  it("usa apenas palavras-chave suportadas pelo modelo", () => {
    const unsupported = [...usedKeywords(MODEL_JSON_SCHEMA)].filter((key) => !SUPPORTED_KEYWORDS.has(key));

    expect(unsupported).toEqual([]);
  });
});
