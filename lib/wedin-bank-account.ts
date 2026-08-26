import { buildWhatsappLink } from './whatsapp'

export const WEDIN_BANK_ACCOUNT = {
  bankName: 'Ueno Bank',
  accountNumber: '619 310 7707',
  alias: '80175973-0',
  accountHolder: 'Teodoro EAS',
  ruc: '80175973-0',
}

export const WEDIN_WHATSAPP_NUMBER = '595982938273'

export function buildWedinWhatsappLink(amount: number, orderReference: string) {
  const message = `Hola! Realicé una transferencia de Gs. ${amount.toLocaleString('es-PY')} para el pedido ${orderReference}. Adjunto el comprobante.`
  return buildWhatsappLink(WEDIN_WHATSAPP_NUMBER, message)
}
