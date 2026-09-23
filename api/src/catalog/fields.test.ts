import { describe, expect, it } from "vitest";

import catalog from "./catalog.json" with { type: "json" };
import { FIELD_DEFINITIONS, getFieldDefinition } from "./fields.js";

const REQUIRED_FIELDS = [...new Set(catalog.flatMap((category) => category.requiredFields))];

describe("dicionário de campos do catálogo", () => {
  it("define rótulo e pergunta para todo campo obrigatório do catálogo", () => {
    for (const field of REQUIRED_FIELDS) {
      expect(FIELD_DEFINITIONS[field], field).toBeDefined();
    }
  });

  it("não deixa a chave técnica do campo virar rótulo na tela", () => {
    for (const [field, definition] of Object.entries(FIELD_DEFINITIONS)) {
      expect(definition.label).not.toBe(field);
      expect(definition.label.length).toBeGreaterThan(0);
      expect(definition.question.length).toBeGreaterThan(0);
    }
  });

  it("devolve um texto utilizável para campo fora do dicionário", () => {
    const definition = getFieldDefinition("campoDesconhecido");

    expect(definition.label).toBe("campoDesconhecido");
    expect(definition.question).toContain("campoDesconhecido");
  });
});
