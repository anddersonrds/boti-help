import { useState } from "react";
import type { FormEvent } from "react";

/**
 * The one-click demo texts. They mirror the offline classifier's rules, so the
 * presentation stays deterministic when the model is unavailable.
 */
const EXAMPLES = [
  {
    label: "Férias",
    text: "Quero tirar 10 dias de férias a partir do dia 15 de janeiro, já alinhei com meu gestor.",
  },
  {
    label: "Dependente",
    text: "Minha filha Helena nasceu semana passada e preciso incluir ela como dependente no plano de saúde.",
  },
  {
    label: "Senha bloqueada",
    text: "Não consigo entrar no sistema de ponto, minha senha está bloqueada desde ontem.",
  },
  {
    label: "Ar-condicionado",
    text: "O ar-condicionado da sala 302 está pingando água no chão desde a manhã.",
  },
] as const;

type TriageFormProps = {
  onSubmit: (text: string) => void;
  isLoading: boolean;
  error: string | null;
};

export default function TriageForm({ onSubmit, isLoading, error }: TriageFormProps) {
  const [text, setText] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isLoading && text.trim().length > 0) onSubmit(text.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <label htmlFor="text" className="block text-sm font-medium text-slate-700">
        Descreva o que você precisa
      </label>

      <textarea
        id="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        maxLength={2000}
        placeholder="Escreva com suas palavras. A triagem descobre a área, a prioridade e o que ainda falta."
        className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Exemplos:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => setText(example.text)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 transition hover:border-slate-500 hover:bg-slate-50"
          >
            {example.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">{text.trim().length} caracteres</span>
        <button
          type="submit"
          disabled={isLoading || text.trim().length === 0}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? "Triando..." : "Triar chamado"}
        </button>
      </div>
    </form>
  );
}
