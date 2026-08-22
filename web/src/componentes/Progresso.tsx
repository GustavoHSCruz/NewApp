export function Progresso({ feitos, total }: { feitos: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((feitos / total) * 100)
  return (
    <div className="progresso">
      <div
        className="progresso__barra"
        role="progressbar"
        aria-valuenow={feitos}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${feitos} de ${total} passos concluídos`}
      >
        <div className="progresso__preenchido" style={{ width: `${pct}%` }} />
      </div>
      <span className="progresso__texto">{feitos}/{total}</span>
    </div>
  )
}
