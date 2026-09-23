import { randomUUID } from "node:crypto";

import { getCategory } from "../catalog/catalog.js";
import { getFieldDefinition } from "../catalog/fields.js";
import { MOCK_LLM } from "../config.js";
import { ModelSuggestionSchema } from "../schema/triage.js";
import type { MissingQuestion, ModelSuggestion, Triage } from "../schema/triage.js";
import { ModelError, requestClassification } from "./gemini.js";
import { classifyWithMock } from "./mock.js";

export type TriageDependencies = {
  useMock?: boolean;
  callModel?: (text: string) => Promise<string>;
  mock?: (text: string) => ModelSuggestion;
};

function parseSuggestion(raw: string): ModelSuggestion | undefined {
  try {
    return ModelSuggestionSchema.parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

/** Routing and completeness never come from the model. Both are resolved here. */
function enrich(suggestion: ModelSuggestion, source: Triage["source"], fallbackReason: Triage["fallbackReason"]): Triage {
  const category = getCategory(suggestion.categoryId);
  const requiredFields = category?.requiredFields ?? [];
  const missingQuestions: MissingQuestion[] = requiredFields
    .filter((field) => !suggestion.fields[field]?.trim())
    .map((field) => ({ field, question: getFieldDefinition(field).question }));

  return {
    id: randomUUID(),
    status: missingQuestions.length > 0 ? "incompleto" : "completo",
    categoryId: suggestion.categoryId,
    department: category?.department ?? null,
    slaHours: category?.slaHours ?? null,
    priority: suggestion.priority,
    title: suggestion.title,
    summary: suggestion.summary,
    fields: suggestion.fields,
    missingQuestions,
    confidence: suggestion.confidence,
    source,
    fallbackReason,
  };
}

/** Reached only when the model breaks the contract twice in a row. */
function outOfCatalog(): Triage {
  return {
    id: randomUUID(),
    status: "fora_do_catalogo",
    categoryId: null,
    department: null,
    slaHours: null,
    priority: "media",
    title: "Não foi possível classificar automaticamente",
    summary: "O pedido precisa ser categorizado manualmente pelo service desk.",
    fields: {},
    missingQuestions: [],
    confidence: 0,
    source: "gemini",
    fallbackReason: null,
  };
}

export async function runTriage(text: string, dependencies: TriageDependencies = {}): Promise<Triage> {
  const {
    useMock = MOCK_LLM,
    callModel = (input: string) => requestClassification(input),
    mock = classifyWithMock,
  } = dependencies;

  if (useMock) return enrich(mock(text), "mock", "flag_manual");

  try {
    // A schema violation earns exactly one more attempt; nothing else does.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const suggestion = parseSuggestion(await callModel(text));
      if (suggestion) return enrich(suggestion, "gemini", null);
    }

    return outOfCatalog();
  } catch (error) {
    const reason = error instanceof ModelError ? error.reason : "rede";
    return enrich(mock(text), "mock", reason);
  }
}
