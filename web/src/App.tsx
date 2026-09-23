import { useCallback, useEffect, useState } from "react";

import MetricsPanel from "./components/MetricsPanel";
import ResultCard from "./components/ResultCard";
import TicketReceipt from "./components/TicketReceipt";
import TriageForm from "./components/TriageForm";
import { ApiError, fetchCatalog, fetchMetrics, openTicket, requestTriage } from "./lib/api";
import type { AcceptedTicket, Catalog, Metrics, Ticket, Triage } from "./lib/api";

const ERROR_MESSAGES: Record<string, string> = {
  texto_invalido: "O texto precisa ter entre 10 e 2000 caracteres.",
  chamado_invalido: "O chamado não satisfaz o contrato esperado.",
  triagem_desconhecida: "Esta triagem não está mais disponível no servidor. Faça uma nova triagem.",
};

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? "Não foi possível completar a operação.";
  }

  return "Não foi possível falar com o servidor.";
}

export default function App() {
  const [catalog, setCatalog] = useState<Catalog>({ categories: [], fieldDefinitions: {} });
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [triage, setTriage] = useState<Triage | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [sentPayload, setSentPayload] = useState<AcceptedTicket | null>(null);
  const [isTriaging, setIsTriaging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  // The panel is read-only: a failure to refresh it must not break the journey.
  const refreshMetrics = useCallback(() => {
    fetchMetrics()
      .then(setMetrics)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchCatalog()
      .then(setCatalog)
      .catch(() => undefined);
    refreshMetrics();
  }, [refreshMetrics]);

  async function handleTriage(text: string) {
    setIsTriaging(true);
    setTriageError(null);
    setTicketError(null);
    setTicket(null);
    setSentPayload(null);

    try {
      setTriage(await requestTriage(text));
      refreshMetrics();
    } catch (error) {
      setTriage(null);
      setTriageError(messageFor(error));
    } finally {
      setIsTriaging(false);
    }
  }

  async function handleAccept(payload: AcceptedTicket) {
    setIsSubmitting(true);
    setTicketError(null);

    try {
      setTicket(await openTicket(payload));
      setSentPayload(payload);
      refreshMetrics();
    } catch (error) {
      setTicketError(messageFor(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
        <header>
          <h1 className="text-2xl font-semibold">Triagem de chamados</h1>
          <p className="mt-1 text-sm text-slate-600">
            Descreva o pedido em texto livre. A triagem sugere categoria, prioridade e aponta o que ainda falta
            antes de abrir o chamado.
          </p>
        </header>

        <TriageForm onSubmit={handleTriage} isLoading={isTriaging} error={triageError} />

        {ticket && sentPayload ? (
          <TicketReceipt ticket={ticket} payload={sentPayload} />
        ) : (
          triage && (
            // Keyed by triage so a new suggestion always starts from a clean draft.
            <ResultCard
              key={triage.id}
              triage={triage}
              categories={catalog.categories}
              fieldDefinitions={catalog.fieldDefinitions}
              onAccept={handleAccept}
              isSubmitting={isSubmitting}
              error={ticketError}
            />
          )
        )}

        <MetricsPanel metrics={metrics} />
      </div>
    </main>
  );
}
