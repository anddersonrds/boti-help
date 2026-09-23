/**
 * Mirrors the contract the Express process exposes. Category ids stay plain
 * strings here because the catalog arrives at runtime, over /api/catalog.
 */
export type Department = "RH" | "TI" | "Facilities";
export type Priority = "baixa" | "media" | "alta" | "critica";
export type TriageStatus = "completo" | "incompleto" | "fora_do_catalogo";
export type Source = "gemini" | "mock";
export type FallbackReason = "rate_limit" | "credencial" | "timeout" | "rede" | "flag_manual";

export const PRIORITIES: readonly Priority[] = ["baixa", "media", "alta", "critica"];

export type Category = {
  id: string;
  name: string;
  department: Department;
  slaHours: number;
  defaultPriority: Priority;
  requiredFields: string[];
  description: string;
  examples: string[];
};

export type MissingQuestion = {
  field: string;
  question: string;
};

export type Triage = {
  id: string;
  status: TriageStatus;
  categoryId: string | null;
  department: Department | null;
  slaHours: number | null;
  priority: Priority;
  title: string;
  summary: string;
  fields: Record<string, string>;
  missingQuestions: MissingQuestion[];
  confidence: number;
  source: Source;
  fallbackReason: FallbackReason | null;
};

export type AcceptedTicket = {
  triageId: string;
  categoryId: string;
  priority: Priority;
  title: string;
  summary: string;
  fields: Record<string, string>;
};

export type Ticket = AcceptedTicket & {
  protocol: string;
  changedFields: string[];
  createdAt: string;
};

export type CorrectedField = {
  field: string;
  count: number;
};

export type Metrics = {
  totalTriages: number;
  totalTickets: number;
  acceptanceRateWithoutEdits: number | null;
  mostCorrectedFields: CorrectedField[];
};

/** Carries the API's own error code so the interface can show a readable message. */
export class ApiError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "ApiError";
  }
}

function errorCodeOf(body: unknown): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    return String((body as { error: unknown }).error);
  }

  return "erro_inesperado";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) throw new ApiError(errorCodeOf(body));

  return body as T;
}

function post<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchCatalog(): Promise<Category[]> {
  const { categories } = await request<{ categories: Category[] }>("/api/catalog");
  return categories;
}

export function requestTriage(text: string): Promise<Triage> {
  return post<Triage>("/api/triage", { text });
}

export function openTicket(payload: AcceptedTicket): Promise<Ticket> {
  return post<Ticket>("/api/tickets", payload);
}

export function fetchMetrics(): Promise<Metrics> {
  return request<Metrics>("/api/metrics");
}
