import catalogData from "./catalog.json" with { type: "json" };

export const DEPARTMENTS = ["RH", "TI", "Facilities"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const PRIORITIES = ["baixa", "media", "alta", "critica"] as const;
export type Priority = (typeof PRIORITIES)[number];

/**
 * Literal tuple so the ids can feed the Zod enum and keep type-level narrowing.
 * It is kept in sync with catalog.json by the loader test, which fails on drift.
 */
export const CATEGORY_IDS = [
  "rh_ferias",
  "rh_dependente",
  "rh_folha",
  "ti_acesso_sistema",
  "ti_equipamento",
  "ti_suporte_geral",
  "fac_manutencao",
  "fac_limpeza",
  "fac_acesso_predio",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Least specific category, used when no classification matches the text. */
export const GENERIC_CATEGORY_ID = "ti_suporte_geral" satisfies CategoryId;

export type Category = {
  id: CategoryId;
  name: string;
  department: Department;
  slaHours: number;
  defaultPriority: Priority;
  requiredFields: string[];
  description: string;
  examples: string[];
};

export const categories = catalogData as unknown as readonly Category[];

export function getCategory(id: string): Category | undefined {
  return categories.find((category) => category.id === id);
}

/** Routing data that must always come from the catalog, never from model output. */
export function getRouting(id: string): { department: Department; slaHours: number } | undefined {
  const category = getCategory(id);
  if (!category) return undefined;

  return { department: category.department, slaHours: category.slaHours };
}
