import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { EXAMPLE_TEXTS } from "./classifier/mock.js";
import { runTriage } from "./classifier/triage.js";
import type { Triage } from "./schema/triage.js";
import { createApp } from "./server.js";
import { createStore } from "./store.js";

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp({ store: createStore(), triage: (text) => runTriage(text, { useMock: true }) });
});

/** Opens one ticket from a real triage, applying the edits the employee would make in the card. */
async function openTicket(text: string, edits: Record<string, unknown> = {}): Promise<void> {
  const response = await request(app).post("/api/triage").send({ text });
  const suggestion = response.body as Triage;

  await request(app)
    .post("/api/tickets")
    .send({
      triageId: suggestion.id,
      categoryId: suggestion.categoryId,
      priority: suggestion.priority,
      title: suggestion.title,
      summary: suggestion.summary,
      fields: suggestion.fields,
      ...edits,
    });
}

async function metrics(): Promise<Record<string, unknown>> {
  const response = await request(app).get("/api/metrics");

  expect(response.status).toBe(200);
  return response.body;
}

describe("métricas do experimento", () => {
  it("devolve taxa nula, e não zero, enquanto nenhum chamado foi aberto", async () => {
    expect(await metrics()).toEqual({
      totalTriages: 0,
      totalTickets: 0,
      acceptanceRateWithoutEdits: null,
      mostCorrectedFields: [],
    });
  });

  it("produz taxa 0.5 com um aceite sem edição e um com edição", async () => {
    await openTicket(EXAMPLE_TEXTS[0]);
    await openTicket(EXAMPLE_TEXTS[2], { priority: "critica" });

    expect(await metrics()).toMatchObject({
      totalTriages: 2,
      totalTickets: 2,
      acceptanceRateWithoutEdits: 0.5,
    });
  });

  it("ordena o campo mais corrigido primeiro, mesmo quando o nome o colocaria por último", async () => {
    await openTicket(EXAMPLE_TEXTS[0], { title: "Férias de janeiro" });
    await openTicket(EXAMPLE_TEXTS[2], { title: "Desbloqueio de senha" });
    await openTicket(EXAMPLE_TEXTS[3], { priority: "critica" });

    expect((await metrics()).mostCorrectedFields).toEqual([
      { field: "title", count: 2 },
      { field: "priority", count: 1 },
    ]);
  });

  it("desempata pelo nome do campo quando a frequência é igual", async () => {
    await openTicket(EXAMPLE_TEXTS[0], { priority: "critica" });
    await openTicket(EXAMPLE_TEXTS[2], { categoryId: "ti_suporte_geral" });

    expect((await metrics()).mostCorrectedFields).toEqual([
      { field: "categoryId", count: 1 },
      { field: "priority", count: 1 },
    ]);
  });
});
