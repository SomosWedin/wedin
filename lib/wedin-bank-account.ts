export const WEDIN_BANK_ACCOUNT = {
  bankName: 'Ueno Bank',
  accountNumber: '8263 2493',
  accountHolder: 'Wedin App',
  ruc: '800.022.353-8',
};

export const WEDIN_WHATSAPP_NUMBER = '595982938273';

export function buildWedinWhatsappLink(amount: number, orderReference: string) {
  const message = `Hola! Realicé una transferencia de Gs. ${amount.toLocaleString('es-PY')} para el pedido ${orderReference}. Adjunto el comprobante.`;
  return `https://wa.me/${WEDIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
