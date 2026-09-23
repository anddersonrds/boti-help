import { describe, expect, it } from "vitest";

import { EXAMPLE_TEXTS } from "./classifier/mock.js";
import { runTriage } from "./classifier/triage.js";
import { logTriage } from "./logger.js";

/** Text that names a dependent, so the triage carries personal data downstream. */
const TEXT = EXAMPLE_TEXTS[1];

async function capture(): Promise<{ written: string; entry: unknown; triage: Awaited<ReturnType<typeof runTriage>> }> {
  const triage = await runTriage(TEXT, { useMock: true });
  const lines: string[] = [];

  logTriage(triage, 42, (line) => lines.push(line));

  return { written: lines.join("\n"), entry: JSON.parse(lines[0]), triage };
}

describe("registro de eventos de triagem", () => {
  it("emite categoria, prioridade, status, fonte, motivo e duração, e nada além disso", async () => {
    const { entry } = await capture();

    expect(entry).toEqual({
      event: "triage",
      categoryId: "rh_dependente",
      priority: "media",
      status: "incompleto",
      source: "mock",
      fallbackReason: "flag_manual",
      durationMs: 42,
    });
  });

  it("não escreve nenhum trecho do texto do colaborador", async () => {
    const { written, triage } = await capture();

    expect(written).not.toContain("Helena");
    expect(written).not.toContain("filha");
    expect(written).not.toContain(triage.title);
    expect(written).not.toContain(triage.summary);
    for (const value of Object.values(triage.fields)) {
      expect(written).not.toContain(value);
    }
  });
});
