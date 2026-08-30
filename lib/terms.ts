export const TERMS_PATHS = {
  organizers: '/bases-y-condiciones/organizadores',
  guests: '/bases-y-condiciones/invitados',
} as const

export type TermsSection = {
  heading: string
  body: string[]
}

export type TermsDocument = {
  title: string
  audience: string
  version: string
  updatedAt: string
  sections: TermsSection[]
}

export function hasAcceptedOrganizerTerms(event: {
  termsAcceptedAt: Date | null
  isPublished: boolean
}) {
  return event.termsAcceptedAt !== null || event.isPublished
}

const PENDING = 'PENDIENTE: falta la redacción legal de esta sección.'

export const ORGANIZER_TERMS: TermsDocument = {
  title: 'Bases y condiciones',
  audience: 'Para novios y organizadores',
  version: '0-borrador',
  updatedAt: 'pendiente',
  sections: [
    {
      heading: 'Qué recibís cuando un invitado elige un regalo',
      body: [PENDING],
    },
    { heading: 'Comisión de wedin', body: [PENDING] },
    { heading: 'Retiro de tu recaudación', body: [PENDING] },
    { heading: 'Activación y visibilidad de tu lista', body: [PENDING] },
    { heading: 'Cancelaciones y reembolsos', body: [PENDING] },
    { heading: 'Tus datos personales', body: [PENDING] },
    { heading: 'Cambios en estas bases', body: [PENDING] },
  ],
}

export const GUEST_TERMS: TermsDocument = {
  title: 'Bases y condiciones',
  audience: 'Para invitados',
  version: '0-borrador',
  updatedAt: 'pendiente',
  sections: [
    { heading: 'Qué estás pagando', body: [PENDING] },
    { heading: 'Cargo por servicio', body: [PENDING] },
    { heading: 'Medios de pago', body: [PENDING] },
    { heading: 'Cancelaciones y reembolsos', body: [PENDING] },
    { heading: 'Tus datos personales', body: [PENDING] },
    { heading: 'Cambios en estas bases', body: [PENDING] },
  ],
}
