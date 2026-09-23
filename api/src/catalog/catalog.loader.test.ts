import { describe, expect, it } from "vitest";

import { CATEGORY_IDS, GENERIC_CATEGORY_ID, categories, getCategory, getRouting } from "./catalog.js";

describe("carregador do catálogo", () => {
  it("encontra a categoria por um id conhecido", () => {
    const category = getCategory("rh_dependente");

    expect(category?.id).toBe("rh_dependente");
    expect(category?.department).toBe("RH");
    expect(category?.requiredFields).toContain("dependentBirthDate");
  });

  it("devolve indefinido para id fora do catálogo", () => {
    expect(getCategory("rh_inexistente")).toBeUndefined();
  });

  it("mantém a tupla de ids alinhada com o catálogo", () => {
    expect(CATEGORY_IDS.length).toBe(categories.length);
    expect([...CATEGORY_IDS]).toEqual(categories.map((category) => category.id));
  });

  it("resolve departamento e sla a partir do catálogo", () => {
    expect(getRouting("ti_acesso_sistema")).toEqual({ department: "TI", slaHours: 8 });
  });

  it("não resolve roteamento para id fora do catálogo", () => {
    expect(getRouting("ti_inexistente")).toBeUndefined();
  });

  it("aponta a categoria genérica para um id existente", () => {
    expect(getCategory(GENERIC_CATEGORY_ID)).toBeDefined();
  });
});
