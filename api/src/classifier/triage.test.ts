import { describe, expect, it } from "vitest";

import { ModelError } from "./gemini.js";
import type { ModelErrorReason } from "./gemini.js";
import { EXAMPLE_TEXTS } from "./mock.js";
import { runTriage } from "./triage.js";
import { getCategory } from "../catalog/catalog.js";
import { TriageSchema } from "../schema/triage.js";

const TEXT = "Quero tirar 10 dias de férias a partir do dia 15 de janeiro.";

const validSuggestion = {
  categoryId: "rh_ferias",
  priority: "media",
  title: "Solicitação de férias",
  summary: "Colaborador quer 10 dias de férias a partir de 15 de janeiro.",
  fields: { startDate: "15 de janeiro", daysCount: "10" },
  confidence: 0.9,
};

/** Returns a model dub that replays the given raw responses and counts calls. */
function replay(...responses: string[]): { call: (text: string) => Promise<string>; calls: () => number } {
  let calls = 0;

  return {
    call: () => {
      const response = responses[Math.min(calls, responses.length - 1)];
      calls += 1;
      return Promise.resolve(response);
    },
    calls: () => calls,
  };
}

describe("orquestração da triagem", () => {
  it("repete a chamada exatamente uma vez quando a resposta não satisfaz o schema", async () => {
    const model = replay('{"categoryId":"rh_inexistente"}', JSON.stringify(validSuggestion));

    const triage = await runTriage(TEXT, { useMock: false, callModel: model.call });

    expect(model.calls()).toBe(2);
    expect(triage.categoryId).toBe("rh_ferias");
    expect(triage.source).toBe("gemini");
  });

  it("devolve fora_do_catalogo quando as duas tentativas são inválidas", async () => {
    const model = replay("isto não é json");

    const triage = await runTriage(TEXT, { useMock: false, callModel: model.call });

    expect(model.calls()).toBe(2);
    expect(triage.status).toBe("fora_do_catalogo");
    expect(triage.categoryId).toBeNull();
    expect(triage.missingQuestions).toEqual([]);
  });

  it("resolve departamento e sla pelo catálogo mesmo quando o modelo devolve outro valor", async () => {
    const model = replay(
      JSON.stringify({ ...validSuggestion, department: "Facilities", slaHours: 999 }),
    );

    const triage = await runTriage(TEXT, { useMock: false, callModel: model.call });

    expect(triage.department).toBe("RH");
    expect(triage.slaHours).toBe(48);
  });

  it("cai no classificador mock com o motivo do erro do cliente", async () => {
    const reasons: ModelErrorReason[] = ["rate_limit", "credencial", "timeout", "rede"];

    for (const reason of reasons) {
      const triage = await runTriage(TEXT, {
        useMock: false,
        callModel: () => Promise.reject(new ModelError(reason, "falhou")),
      });

      expect(triage.source).toBe("mock");
      expect(triage.fallbackReason).toBe(reason);
      expect(triage.categoryId).toBe("rh_ferias");
    }
  });

  it("classifica pelo mock sem chamar o modelo quando a flag está ligada", async () => {
    const model = replay(JSON.stringify(validSuggestion));

    const triage = await runTriage(TEXT, { useMock: true, callModel: model.call });

    expect(model.calls()).toBe(0);
    expect(triage.source).toBe("mock");
    expect(triage.fallbackReason).toBe("flag_manual");
  });

  it("produz incompleto com uma pergunta por campo obrigatório ausente", async () => {
    const model = replay(
      JSON.stringify({
        ...validSuggestion,
        categoryId: "rh_dependente",
        fields: { dependentName: "Helena" },
      }),
    );

    const triage = await runTriage(TEXT, { useMock: false, callModel: model.call });
    const requiredFields = getCategory("rh_dependente")?.requiredFields ?? [];

    expect(triage.status).toBe("incompleto");
    expect(triage.missingQuestions.map((item) => item.field)).toEqual(["relationship", "dependentBirthDate"]);
    for (const item of triage.missingQuestions) {
      expect(requiredFields).toContain(item.field);
      expect(item.question.length).toBeGreaterThan(0);
    }
  });

  it("produz completo com lista vazia quando todos os campos obrigatórios estão presentes", async () => {
    const model = replay(JSON.stringify(validSuggestion));

    const triage = await runTriage(TEXT, { useMock: false, callModel: model.call });

    expect(triage.status).toBe("completo");
    expect(triage.missingQuestions).toEqual([]);
  });

  it("satisfaz o contrato de triagem em todos os caminhos", async () => {
    const paths = [
      runTriage(TEXT, { useMock: false, callModel: replay(JSON.stringify(validSuggestion)).call }),
      runTriage(TEXT, { useMock: false, callModel: replay("quebrado").call }),
      runTriage(TEXT, { useMock: true }),
    ];

    for (const path of paths) {
      const triage = await path;

      expect(TriageSchema.safeParse(triage).success).toBe(true);
      expect(["gemini", "mock"]).toContain(triage.source);
    }
  });

  it("deixa exatamente um dos quatro exemplos incompleto pelo mock", async () => {
    const statuses = await Promise.all(
      EXAMPLE_TEXTS.map(async (text) => (await runTriage(text, { useMock: true })).status),
    );

    expect(statuses.filter((status) => status === "incompleto")).toHaveLength(1);
    expect(statuses).toEqual(["completo", "incompleto", "completo", "completo"]);
  });
});
