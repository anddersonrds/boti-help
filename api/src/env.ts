import { fileURLToPath } from "node:url";

import { config } from "dotenv";

// The .env lives at the repository root, while the api process runs from its own workspace.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });
