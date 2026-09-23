import { describe, expect, it } from "vitest";

import { ModelError, requestClassification } from "./gemini.js";
import type { ModelCall } from "./gemini.js";
import { TEXT_OPEN_TAG } from "./prompt.js";

const TEXT = "Meu notebook está desligando sozinho toda hora.";

const API_KEY = "AIza-chave-secreta-do-ambiente";

function failingCall(error: unknown): ModelCall {
  return () => Promise.reject(error);
}

function httpError(status: number, message: string): Error {
  return Object.assign(new Error(message), { status });
}

async function reasonOf(call: ModelCall, timeoutMs?: number): Promise<string> {
  try {
    await requestClassification(TEXT, { call, timeoutMs });
  } catch (error) {
    if (error instanceof ModelError) return error.reason;
    throw error;
  }

  throw new Error("a chamada deveria ter falhado");
}

describe("cliente do modelo", () => {
  it("devolve o texto bruto da resposta para a orquestração validar", async () => {
    const call: ModelCall = ({ userContent }) =>
      Promise.resolve(userContent.includes(TEXT_OPEN_TAG) ? '{"categoryId":"ti_equipamento"}' : "");

    expect(await requestClassification(TEXT, { call })).toBe('{"categoryId":"ti_equipamento"}');
  });

  it("traduz 429 em rate_limit", async () => {
    expect(await reasonOf(failingCall(httpError(429, "Too Many Requests")))).toBe("rate_limit");
  });

  it("traduz 401 e 403 em credencial", async () => {
    expect(await reasonOf(failingCall(httpError(401, "Unauthorized")))).toBe("credencial");
    expect(await reasonOf(failingCall(httpError(403, "Forbidden")))).toBe("credencial");
  });

  it("traduz o aborto por tempo limite em timeout", async () => {
    const neverResolves: ModelCall = () => new Promise(() => {});

    expect(await reasonOf(neverResolves, 10)).toBe("timeout");
  });

  it("traduz falha de rede em rede", async () => {
    expect(await reasonOf(failingCall(new TypeError("fetch failed")))).toBe("rede");
  });

  it("não carrega a chave do ambiente para o erro tipado", async () => {
    const leaking = httpError(401, `Unauthorized: API key ${API_KEY} is invalid`);

    try {
      await requestClassification(TEXT, { call: failingCall(leaking) });
      throw new Error("a chamada deveria ter falhado");
    } catch (error) {
      expect(error).toBeInstanceOf(ModelError);
      expect((error as ModelError).message).not.toContain(API_KEY);
      expect(JSON.stringify(error, Object.getOwnPropertyNames(error))).not.toContain(API_KEY);
    }
  });
});
