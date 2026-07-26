export function buildWhatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// Guests enter their phone in local Paraguayan format (e.g. "0981234567");
// wa.me needs the full international number, without the leading trunk 0.
export function toParaguayInternationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('595') ? digits : `595${digits.replace(/^0/, '')}`;
}
