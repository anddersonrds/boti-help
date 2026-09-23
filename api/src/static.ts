import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import express from "express";
import type { Express } from "express";

/** Vite writes the interface build here; in production the same process serves it. */
const WEB_BUILD_DIR = fileURLToPath(new URL("../../web/dist", import.meta.url));

const INDEX_FILE = fileURLToPath(new URL("../../web/dist/index.html", import.meta.url));

/**
 * Serves the interface from the same origin as the API: one deploy, one domain, no CORS.
 * Without a build present nothing is mounted, so the API alone still boots in development.
 */
export function serveWebBuild(app: Express): void {
  if (!existsSync(INDEX_FILE)) return;

  app.use(express.static(WEB_BUILD_DIR));

  // Any other navigation falls back to the interface entry point, never to the API.
  app.use((request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api/")) {
      next();
      return;
    }

    response.sendFile(INDEX_FILE);
  });
}
