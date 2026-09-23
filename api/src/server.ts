import { pathToFileURL } from "node:url";

import express from "express";
import type { Express } from "express";

import { categories } from "./catalog/catalog.js";
import { runTriage } from "./classifier/triage.js";
import { PORT } from "./config.js";
import { logTriage } from "./logger.js";
import { AcceptedTicketSchema } from "./schema/triage.js";
import type { Triage } from "./schema/triage.js";
import { createStore } from "./store.js";
import type { Store } from "./store.js";

export const MIN_TEXT_LENGTH = 10;
export const MAX_TEXT_LENGTH = 2000;

export type AppDependencies = {
  triage?: (text: string) => Promise<Triage>;
  store?: Store;
};

function isValidText(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const text = value.trim();
  return text.length >= MIN_TEXT_LENGTH && text.length <= MAX_TEXT_LENGTH;
}

export function createApp(dependencies: AppDependencies = {}): Express {
  const { triage = runTriage, store = createStore() } = dependencies;
  const app = express();

  app.use(express.json({ limit: "64kb" }));

  /** The interface resolves department, SLA and required fields from this locally. */
  app.get("/api/catalog", (_request, response) => {
    response.json({ categories });
  });

  app.post("/api/triage", async (request, response) => {
    const { text } = request.body ?? {};

    // Checked before anything else, so an invalid text never costs a model call.
    if (!isValidText(text)) {
      response.status(400).json({ error: "texto_invalido" });
      return;
    }

    const startedAt = Date.now();
    const result = await triage(text.trim());
    logTriage(result, Date.now() - startedAt);
    store.saveTriage(result);

    response.json(result);
  });

  app.post("/api/tickets", (request, response) => {
    const accepted = AcceptedTicketSchema.safeParse(request.body);

    if (!accepted.success) {
      response.status(400).json({ error: "chamado_invalido" });
      return;
    }

    const ticket = store.openTicket(accepted.data);

    if (!ticket) {
      response.status(400).json({ error: "triagem_desconhecida" });
      return;
    }

    response.status(201).json(ticket);
  });

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(PORT, () => console.log(`api on :${PORT}`));
}
