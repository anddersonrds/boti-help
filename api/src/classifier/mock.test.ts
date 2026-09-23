import { describe, expect, it } from "vitest";

import { EXAMPLE_TEXTS, classifyWithMock } from "./mock.js";
import { GENERIC_CATEGORY_ID, getCategory } from "../catalog/catalog.js";

function missingRequiredFields(text: string): string[] {
  const suggestion = classifyWithMock(text);
  const required = getCategory(suggestion.categoryId)?.requiredFields ?? [];

  return required.filter((field) => !suggestion.fields[field]);
}

describe("classificador mock", () => {
  it("devolve sempre o mesmo resultado para cada exemplo da interface", () => {
    for (const text of EXAMPLE_TEXTS) {
      expect(classifyWithMock(text)).toEqual(classifyWithMock(text));
    }

    expect(EXAMPLE_TEXTS.map((text) => classifyWithMock(text).categoryId)).toEqual([
      "rh_ferias",
      "rh_dependente",
      "ti_acesso_sistema",
      "fac_manutencao",
    ]);
  });

  it("deixa exatamente um dos quatro exemplos com campo obrigatório ausente", () => {
    const incomplete = EXAMPLE_TEXTS.filter((text) => missingRequiredFields(text).length > 0);

    expect(incomplete).toHaveLength(1);
    expect(missingRequiredFields(incomplete[0])).toEqual(["dependentBirthDate"]);
  });

  it("cai na categoria de menor especificidade com confiança 0.3 sem palavra-chave", () => {
    const suggestion = classifyWithMock("Preciso de uma ajuda com uma coisa aqui do escritório.");

    expect(suggestion.categoryId).toBe(GENERIC_CATEGORY_ID);
    expect(suggestion.confidence).toBe(0.3);
  });
});
