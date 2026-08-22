/** O arco é o horizonte: o sol subindo acima da linha do dia. */
export function Marca() {
  return (
    <svg className="marca__arco" width="26" height="18" viewBox="0 0 26 18" aria-hidden="true">
      <path d="M2 15h22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".35" />
      <path d="M5 15a8 8 0 0 1 16 0" stroke="var(--acento)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="13" cy="7.5" r="2.6" fill="var(--sol)" />
    </svg>
  )
}
