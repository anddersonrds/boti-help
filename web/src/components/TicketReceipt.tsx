import type { AcceptedTicket, Ticket } from "../lib/api";

type TicketReceiptProps = {
  ticket: Ticket;
  /** The object handed to the API, rendered verbatim so the contract is visible. */
  payload: AcceptedTicket;
};

export default function TicketReceipt({ ticket, payload }: TicketReceiptProps) {
  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
      <h2 className="text-lg font-semibold text-emerald-900">Chamado aberto</h2>
      <p className="mt-1 text-sm text-emerald-800">
        Protocolo <span className="font-mono font-semibold">{ticket.protocol}</span>
      </p>

      <h3 className="mt-5 text-sm font-medium text-emerald-900">Payload enviado</h3>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-emerald-900 p-4 text-xs leading-relaxed text-emerald-50">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </section>
  );
}
