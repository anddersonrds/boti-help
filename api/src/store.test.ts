import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { EXAMPLE_TEXTS } from "./classifier/mock.js";
import { runTriage } from "./classifier/triage.js";
import type { Triage } from "./schema/triage.js";
import { createApp } from "./server.js";
import { createStore } from "./store.js";

let store: ReturnType<typeof createStore>;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  store = createStore();
  app = createApp({ store, triage: (text) => runTriage(text, { useMock: true }) });
});

/** Runs a real triage through the API and returns the suggestion the card would show. */
async function triage(text: string): Promise<Triage> {
  const response = await request(app).post("/api/triage").send({ text });
  return response.body as Triage;
}

/** The payload the card sends when the employee accepts the suggestion untouched. */
function acceptedFrom(suggestion: Triage): Record<string, unknown> {
  return {
    triageId: suggestion.id,
    categoryId: suggestion.categoryId,
    priority: suggestion.priority,
    title: suggestion.title,
    summary: suggestion.summary,
    fields: suggestion.fields,
  };
}

describe("abertura de chamado", () => {
  it("registra lista de campos alterados vazia quando o payload é aceito sem alteração", async () => {
    const suggestion = await triage(EXAMPLE_TEXTS[0]);

    const response = await request(app).post("/api/tickets").send(acceptedFrom(suggestion));

    expect(response.status).toBe(201);
    expect(response.body.changedFields).toEqual([]);
    expect(store.tickets()).toHaveLength(1);
    expect(store.tickets()[0].changedFields).toEqual([]);
  });

  it("registra priority na lista quando a prioridade é alterada", async () => {
    const suggestion = await triage(EXAMPLE_TEXTS[0]);

    const response = await request(app)
      .post("/api/tickets")
      .send({ ...acceptedFrom(suggestion), priority: "critica" });

    expect(response.status).toBe(201);
    expect(store.tickets()[0].changedFields).toEqual(["priority"]);
    expect(store.tickets()[0].priority).toBe("critica");
  });

  it("registra o campo preenchido pelo colaborador quando a triagem estava incompleta", async () => {
    const suggestion = await triage(EXAMPLE_TEXTS[1]);

    expect(suggestion.status).toBe("incompleto");

    await request(app)
      .post("/api/tickets")
      .send({
        ...acceptedFrom(suggestion),
        fields: { ...suggestion.fields, dependentBirthDate: "12/09/2026" },
      });

    expect(store.tickets()[0].changedFields).toEqual(["dependentBirthDate"]);
  });

  it("responde 400 e não registra quando a categoria está fora do catálogo", async () => {
    const suggestion = await triage(EXAMPLE_TEXTS[0]);

    const response = await request(app)
      .post("/api/tickets")
      .send({ ...acceptedFrom(suggestion), categoryId: "rh_inexistente" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "chamado_invalido" });
    expect(store.tickets()).toHaveLength(0);
  });

  it("responde 400 e não registra quando a triagem de origem não existe", async () => {
    const suggestion = await triage(EXAMPLE_TEXTS[0]);

    const response = await request(app)
      .post("/api/tickets")
      .send({ ...acceptedFrom(suggestion), triageId: "triagem-que-nunca-existiu" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "triagem_desconhecida" });
    expect(store.tickets()).toHaveLength(0);
  });

  it("devolve protocolos sequenciais e distintos no formato do service desk", async () => {
    const year = new Date().getFullYear();

    const first = await request(app).post("/api/tickets").send(acceptedFrom(await triage(EXAMPLE_TEXTS[0])));
    const second = await request(app).post("/api/tickets").send(acceptedFrom(await triage(EXAMPLE_TEXTS[2])));

    expect(first.body.protocol).toBe(`BOTI-${year}-0001`);
    expect(second.body.protocol).toBe(`BOTI-${year}-0002`);
    expect(first.body.protocol).not.toBe(second.body.protocol);
  });
});
