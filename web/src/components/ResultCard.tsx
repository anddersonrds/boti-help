import { useState } from "react";

import { PRIORITIES } from "../lib/api";
import type { AcceptedTicket, Category, FallbackReason, Priority, Triage } from "../lib/api";

const PRIORITY_LABELS: Record<Priority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

/** Why the result did not come from the model, in words the room understands. */
const FALLBACK_LABELS: Record<FallbackReason, string> = {
  rate_limit: "limite de requisições do modelo atingido",
  credencial: "credencial do modelo ausente ou inválida",
  timeout: "o modelo não respondeu no tempo limite",
  rede: "falha de rede ao chamar o modelo",
  flag_manual: "modo offline ativado por configuração",
};

type ResultCardProps = {
  triage: Triage;
  categories: Category[];
  onAccept: (payload: AcceptedTicket) => void;
  isSubmitting: boolean;
  error: string | null;
};

export default function ResultCard({ triage, categories, onAccept, isSubmitting, error }: ResultCardProps) {
  const [categoryId, setCategoryId] = useState(triage.categoryId ?? "");
  const [priority, setPriority] = useState<Priority>(triage.priority);
  const [title, setTitle] = useState(triage.title);
  const [summary, setSummary] = useState(triage.summary);
  const [fields, setFields] = useState<Record<string, string>>(triage.fields);

  // Routing always comes from the catalog, so changing the category recomputes
  // department, SLA and which fields are still pending.
  const category = categories.find((candidate) => candidate.id === categoryId);
  const requiredFields = category?.requiredFields ?? [];
  const pendingFields = requiredFields.filter((field) => !(fields[field] ?? "").trim());

  const canAccept =
    categoryId !== "" &&
    pendingFields.length === 0 &&
    title.trim().length > 0 &&
    summary.trim().length > 0 &&
    !isSubmitting;

  function questionFor(field: string): string {
    return triage.missingQuestions.find((question) => question.field === field)?.question ?? field;
  }

  /** Answers are merged into the payload locally, without a second triage call. */
  function setField(field: string, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function handleAccept() {
    if (!canAccept) return;
    onAccept({ triageId: triage.id, categoryId, priority, title, summary, fields });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Sugestão de chamado</h2>
          <p className="text-sm text-slate-500">Revise e ajuste antes de abrir.</p>
        </div>

        {triage.source === "mock" && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Classificado sem o modelo
            {triage.fallbackReason ? `: ${FALLBACK_LABELS[triage.fallbackReason]}` : ""}
          </span>
        )}
      </header>

      {triage.status === "fora_do_catalogo" && (
        <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          Não foi possível classificar automaticamente. Escolha a categoria para seguir.
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Categoria</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Prioridade</span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            {PRIORITIES.map((option) => (
              <option key={option} value={option}>
                {PRIORITY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="mt-4 flex gap-6 text-sm">
        <div>
          <dt className="text-slate-500">Departamento</dt>
          <dd className="font-medium text-slate-900">{category?.department ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">SLA</dt>
          <dd className="font-medium text-slate-900">{category ? `${category.slaHours}h` : "-"}</dd>
        </div>
      </dl>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-slate-700">Título</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-slate-700">Resumo</span>
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={3}
          className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
        />
      </label>

      {requiredFields.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-slate-700">Campos obrigatórios da categoria</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {requiredFields.map((field) => {
              const isPending = pendingFields.includes(field);

              return (
                <label key={field} className="block text-sm">
                  <span className={isPending ? "text-amber-700" : "text-slate-600"}>{questionFor(field)}</span>
                  <input
                    value={fields[field] ?? ""}
                    onChange={(event) => setField(field, event.target.value)}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 ${
                      isPending ? "border-amber-400 bg-amber-50" : "border-slate-300"
                    }`}
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          {pendingFields.length > 0
            ? `Faltam ${pendingFields.length} campo(s) obrigatório(s) para abrir o chamado.`
            : "Tudo pronto para abrir o chamado."}
        </p>
        <button
          type="button"
          onClick={handleAccept}
          disabled={!canAccept}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "Abrindo..." : "Abrir chamado"}
        </button>
      </div>
    </section>
  );
}
