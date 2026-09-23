import type { Metrics } from "../lib/api";

type MetricsPanelProps = {
  metrics: Metrics | null;
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-slate-900">{value}</dd>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  const topCorrected = metrics?.mostCorrectedFields[0];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Sinal do experimento</h2>
      <p className="text-sm text-slate-500">Medido nesta sessão, a partir dos chamados abertos aqui.</p>

      <dl className="mt-5 grid gap-6 sm:grid-cols-3">
        <Stat label="Triagens" value={String(metrics?.totalTriages ?? 0)} />

        <Stat
          label="Aceite sem edição"
          // Null is not zero: without a ticket there is no measurement yet.
          value={
            metrics?.acceptanceRateWithoutEdits == null
              ? "-"
              : `${Math.round(metrics.acceptanceRateWithoutEdits * 100)}%`
          }
          hint={
            metrics?.acceptanceRateWithoutEdits == null
              ? "Nenhum chamado aberto ainda"
              : `${metrics.totalTickets} chamado(s) aberto(s)`
          }
        />

        <Stat
          label="Campo mais corrigido"
          value={topCorrected ? topCorrected.field : "-"}
          hint={topCorrected ? `corrigido ${topCorrected.count}x` : "Nenhuma correção registrada"}
        />
      </dl>
    </section>
  );
}
