import { GoogleGenAI } from "@google/genai";

import { GEMINI_API_KEY } from "../config.js";
import { MODEL_JSON_SCHEMA } from "../schema/triage.js";
import type { FallbackReason } from "../schema/triage.js";
import { buildPrompt } from "./prompt.js";

export const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export const TIMEOUT_MS = 10_000;

/** Every fallback reason the client can produce. `flag_manual` never comes from here. */
export type ModelErrorReason = Exclude<FallbackReason, "flag_manual">;

/**
 * Carries only the reason and a message written here. The upstream error is not
 * attached, so nothing from the provider response can leak the key downstream.
 */
export class ModelError extends Error {
  readonly reason: ModelErrorReason;

  constructor(reason: ModelErrorReason, message: string) {
    super(message);
    this.name = "ModelError";
    this.reason = reason;
  }
}

export type ModelCall = (params: {
  systemInstruction: string;
  userContent: string;
  signal: AbortSignal;
}) => Promise<string>;

const callGemini: ModelCall = async ({ systemInstruction, userContent, signal }) => {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userContent,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseJsonSchema: MODEL_JSON_SCHEMA,
      abortSignal: signal,
    },
  });

  return response.text ?? "";
};

function reasonFor(error: unknown): ModelErrorReason {
  const status = (error as { status?: unknown }).status;

  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "credencial";

  return "rede";
}

/** Rejects as soon as the deadline fires, even if the call ignores the signal. */
function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    signal.addEventListener(
      "abort",
      () => reject(new ModelError("timeout", `modelo não respondeu em ${TIMEOUT_MS} ms`)),
      { once: true },
    );
  });
}

/**
 * Returns the model's raw JSON text. Parsing and validation stay with the
 * orchestration, so a malformed body is a validation failure, not a client error.
 */
export async function requestClassification(
  text: string,
  options: { call?: ModelCall; timeoutMs?: number } = {},
): Promise<string> {
  const { call = callGemini, timeoutMs = TIMEOUT_MS } = options;
  const { systemInstruction, userContent } = buildPrompt(text);
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await Promise.race([
      call({ systemInstruction, userContent, signal: controller.signal }),
      rejectOnAbort(controller.signal),
    ]);
  } catch (error) {
    if (error instanceof ModelError) throw error;
    if (controller.signal.aborted) throw new ModelError("timeout", `modelo não respondeu em ${timeoutMs} ms`);

    const reason = reasonFor(error);
    throw new ModelError(reason, `chamada ao modelo falhou por ${reason}`);
  } finally {
    clearTimeout(deadline);
  }
}
