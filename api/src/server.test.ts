import request from "supertest";
import { describe, expect, it } from "vitest";

// Set before the modules read the environment, so the leak check runs against a real key value.
const API_KEY = "sentinela-chave-que-nao-pode-vazar";
process.env.MOCK_LLM = "1";
process.env.GEMINI_API_KEY = API_KEY;

const { getCategory } = await import("./catalog/catalog.js");
const { EXAMPLE_TEXTS } = await import("./classifier/mock.js");
const { TriageSchema } = await import("./schema/triage.js");
const { createApp, MAX_TEXT_LENGTH, MIN_TEXT_LENGTH } = await import("./server.js");

/** App whose classifier rejects, so any call to it fails the test that forbids one. */
function appWithForbiddenClassifier(): { app: ReturnType<typeof createApp>; calls: () => number } {
  let calls = 0;

  return {
    app: createApp({
      triage: () => {
        calls += 1;
        return Promise.reject(new Error("o classificador não deveria ter sido chamado"));
      },
    }),
    calls: () => calls,
  };
}

describe("endpoint de triagem", () => {
  it("recusa texto curto com texto_invalido e sem chamar o classificador", async () => {
    const { app, calls } = appWithForbiddenClassifier();

    const response = await request(app)
      .post("/api/triage")
      .send({ text: "a".repeat(MIN_TEXT_LENGTH - 1) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "texto_invalido" });
    expect(calls()).toBe(0);
  });

  it("recusa texto longo com texto_invalido e sem chamar o classificador", async () => {
    const { app, calls } = appWithForbiddenClassifier();

    const response = await request(app)
      .post("/api/triage")
      .send({ text: "a".repeat(MAX_TEXT_LENGTH + 1) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "texto_invalido" });
    expect(calls()).toBe(0);
  });

  it("recusa texto só com espaço, mesmo quando o comprimento bruto bastaria", async () => {
    const { app, calls } = appWithForbiddenClassifier();

    const response = await request(app)
      .post("/api/triage")
      .send({ text: " ".repeat(MIN_TEXT_LENGTH + 5) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "texto_invalido" });
    expect(calls()).toBe(0);
  });

  it("aceita os textos no limite exato do intervalo permitido", async () => {
    const app = createApp();

    for (const length of [MIN_TEXT_LENGTH, MAX_TEXT_LENGTH]) {
      const response = await request(app)
        .post("/api/triage")
        .send({ text: "a".repeat(length) });

      expect(response.status).toBe(200);
    }
  });

  it("responde 200 com um corpo que satisfaz o contrato de triagem", async () => {
    const response = await request(createApp())
      .post("/api/triage")
      .send({ text: EXAMPLE_TEXTS[0] });

    expect(response.status).toBe(200);
    expect(TriageSchema.safeParse(response.body).success).toBe(true);

    const category = getCategory(response.body.categoryId);
    expect(response.body.department).toBe(category?.department);
    expect(response.body.slaHours).toBe(category?.slaHours);
  });

  it("não devolve a chave do modelo em nenhuma resposta", async () => {
    const app = createApp();

    const triage = await request(app).post("/api/triage").send({ text: EXAMPLE_TEXTS[0] });
    const catalog = await request(app).get("/api/catalog");

    expect(triage.text).not.toContain(API_KEY);
    expect(catalog.text).not.toContain(API_KEY);
  });
});

describe("endpoint do catálogo", () => {
  it("expõe departamento, sla e campos obrigatórios de cada categoria", async () => {
    const response = await request(createApp()).get("/api/catalog");

    expect(response.status).toBe(200);
    expect(response.body.categories).toHaveLength(9);
    expect(response.body.categories.find((category: { id: string }) => category.id === "rh_ferias")).toMatchObject({
      department: "RH",
      slaHours: 48,
      requiredFields: ["startDate", "daysCount"],
    });
  });
});
