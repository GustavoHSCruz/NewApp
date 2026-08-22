const FUSO = 'T12:00:00' // evita o clássico "voltou um dia" por fuso horário

export const hojeISO = () => new Date().toISOString().slice(0, 10)

export function paraData(iso: string) {
  return new Date(`${iso}${FUSO}`)
}

export function somarDias(iso: string, n: number) {
  const d = paraData(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function diferencaEmDias(iso: string, base = hojeISO()) {
  return Math.round((paraData(iso).getTime() - paraData(base).getTime()) / 86_400_000)
}

const curta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
const longa = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

export const dataCurta = (iso: string) => curta.format(paraData(iso)).replace('.', '')
export const dataLonga = (iso: string) => longa.format(paraData(iso))

/** "hoje", "amanhã", "venceu há 3 dias", "em 5 dias" — em português de gente. */
export function quando(iso: string, base = hojeISO()) {
  const d = diferencaEmDias(iso, base)
  if (d === 0) return 'hoje'
  if (d === 1) return 'amanhã'
  if (d === -1) return 'venceu ontem'
  if (d < -1) return `venceu há ${-d} dias`
  if (d < 7) return `em ${d} dias`
  return dataCurta(iso)
}

export function plural(n: number, um: string, muitos: string) {
  return n === 1 ? `1 ${um}` : `${n} ${muitos}`
}
