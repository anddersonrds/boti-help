import { GENERIC_CATEGORY_ID, getCategory } from "../catalog/catalog.js";
import type { ModelSuggestion } from "../schema/triage.js";

/**
 * Texts the interface offers as one-click examples. They live next to the rules
 * that match them so the offline path stays deterministic for the demo.
 */
export const EXAMPLE_TEXTS = [
  "Quero tirar 10 dias de férias a partir do dia 15 de janeiro, já alinhei com meu gestor.",
  "Minha filha Helena nasceu semana passada e preciso incluir ela como dependente no plano de saúde.",
  "Não consigo entrar no sistema de ponto, minha senha está bloqueada desde ontem.",
  "O ar-condicionado da sala 302 está pingando água no chão desde a manhã.",
] as const;

type Rule = {
  keywords: readonly string[];
  suggestion: ModelSuggestion;
};

/** Evaluated in order; the first rule with a matching keyword wins. */
const RULES: readonly Rule[] = [
  {
    keywords: ["ferias"],
    suggestion: {
      categoryId: "rh_ferias",
      priority: "media",
      title: "Solicitação de férias",
      summary: "Colaborador quer tirar 10 dias de férias a partir de 15 de janeiro.",
      fields: { startDate: "15 de janeiro", daysCount: "10" },
      confidence: 0.92,
    },
  },
  {
    keywords: ["dependente", "plano de saude", "plano odontologico"],
    suggestion: {
      categoryId: "rh_dependente",
      priority: "media",
      title: "Inclusão de dependente no plano de saúde",
      summary: "Colaborador quer incluir a filha recém-nascida como dependente no plano de saúde.",
      fields: { dependentName: "Helena", relationship: "filha" },
      confidence: 0.88,
    },
  },
  {
    keywords: ["senha", "sistema de ponto", "acesso ao sistema", "login", "bloqueada"],
    suggestion: {
      categoryId: "ti_acesso_sistema",
      priority: "alta",
      title: "Senha bloqueada no sistema de ponto",
      summary: "Colaborador não consegue entrar no sistema de ponto porque a senha está bloqueada.",
      fields: { systemName: "sistema de ponto", accessType: "desbloqueio de senha" },
      confidence: 0.9,
    },
  },
  {
    keywords: ["ar-condicionado", "ar condicionado", "vazamento", "lampada", "manutencao"],
    suggestion: {
      categoryId: "fac_manutencao",
      priority: "media",
      title: "Ar-condicionado vazando na sala 302",
      summary: "O ar-condicionado da sala 302 está pingando água no chão.",
      fields: { location: "sala 302", issueType: "ar-condicionado vazando" },
      confidence: 0.87,
    },
  },
];

const GENERIC_PRIORITY = getCategory(GENERIC_CATEGORY_ID)?.defaultPriority ?? "baixa";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Offline classifier: same output shape as the model, without network or quota. */
export function classifyWithMock(text: string): ModelSuggestion {
  const normalized = normalize(text);
  const rule = RULES.find((candidate) => candidate.keywords.some((keyword) => normalized.includes(keyword)));

  if (rule) return { ...rule.suggestion, fields: { ...rule.suggestion.fields } };

  const description = text.trim();
  return {
    categoryId: GENERIC_CATEGORY_ID,
    priority: GENERIC_PRIORITY,
    title: "Pedido de suporte",
    summary: description,
    fields: { needDescription: description },
    confidence: 0.3,
  };
}
