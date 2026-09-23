import { describe, expect, it } from "vitest";

import catalog from "./catalog.json" with { type: "json" };

const KEYS = [
  "id",
  "name",
  "department",
  "slaHours",
  "defaultPriority",
  "requiredFields",
  "description",
  "examples",
];

const DEPARTMENTS = ["RH", "TI", "Facilities"];
const PRIORITIES = ["baixa", "media", "alta", "critica"];

describe("catálogo de categorias", () => {
  it("não tem id repetido", () => {
    const ids = catalog.map((category) => category.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("descreve cada categoria com as oito chaves do contrato", () => {
    for (const category of catalog) {
      expect(Object.keys(category).sort()).toEqual([...KEYS].sort());
    }
  });

  it("usa apenas prioridades do enum fechado", () => {
    for (const category of catalog) {
      expect(PRIORITIES).toContain(category.defaultPriority);
    }
  });

  it("usa apenas os três departamentos previstos", () => {
    for (const category of catalog) {
      expect(DEPARTMENTS).toContain(category.department);
    }
  });

  it("declara ao menos um campo obrigatório por categoria", () => {
    for (const category of catalog) {
      expect(category.requiredFields.length).toBeGreaterThan(0);
      expect(category.requiredFields.every((field) => typeof field === "string" && field.length > 0)).toBe(true);
    }
  });

  it("traz descrição e exemplos para alimentar o prompt", () => {
    for (const category of catalog) {
      expect(category.description.length).toBeGreaterThan(0);
      expect(category.examples.length).toBeGreaterThan(0);
    }
  });
});
