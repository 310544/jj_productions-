const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const MESES_CORTOS = ['ene.','feb.','mar.','abr.','may.','jun.','jul.','ago.','sep.','oct.','nov.','dic.']

export function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  const dia = d.getDate()
  const mes = MESES[d.getMonth()]
  const año = d.getFullYear()
  return `${dia} ${mes} ${año}`
}

export function formatDateShort(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`
}

export function formatDateRange(inicio: string, fin: string): string {
  return `${formatDate(inicio)} → ${formatDate(fin)}`
}
