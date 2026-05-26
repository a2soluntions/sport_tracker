import OpportunityTable from "@/components/OpportunityTable";

export default function OportunidadesPage() {
  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Oportunidades +EV</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.95rem', lineHeight: '1.4' }}>
            As odds abaixo foram identificadas pelo Motor de Poisson como de Valor Esperado Positivo.
          </p>
        </div>
        <div className="badge-neon" style={{ flexShrink: 0 }}>
          Motor Online • 2 Alertas
        </div>
      </header>

      <section className="glass-panel" style={{ padding: '16px' }}>
        <OpportunityTable />
      </section>
    </>
  );
}
