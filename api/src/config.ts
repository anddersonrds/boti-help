export const PORT = Number(process.env.PORT ?? 3000);

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

export const MOCK_LLM = process.env.MOCK_LLM === "1";
