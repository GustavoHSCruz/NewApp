export function Marcar({ feito, aoAlternar, rotulo }: { feito: boolean; aoAlternar: () => void; rotulo: string }) {
  return (
    <button
      className="marcar"
      aria-pressed={feito}
      aria-label={feito ? `Reabrir: ${rotulo}` : `Concluir: ${rotulo}`}
      onClick={aoAlternar}
      type="button"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
