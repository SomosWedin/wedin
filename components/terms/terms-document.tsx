import { FiExternalLink } from 'react-icons/fi'
import { buttonVariants } from '@/components/ui/button'
import type { TermsDocument } from '@/lib/terms'

type TermsDocumentViewProps = {
  terms: TermsDocument
  fileUrl: string
}

export default function TermsDocumentView({
  terms,
  fileUrl,
}: TermsDocumentViewProps) {
  return (
    <article className="px-4 py-10 mx-auto max-w-4xl sm:px-6 sm:py-16">
      <header className="pb-8 md:border-b md:border-gray-200">
        <p className="text-sm font-medium tracking-wide uppercase text-primary400">
          {terms.audience}
        </p>

        <h1 className="mt-2 text-3xl font-black">{terms.title}</h1>

        <p className="mt-3 text-sm text-textTertiary">{terms.summary}</p>

        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: 'outline', className: 'mt-6' })}
        >
          <FiExternalLink className="mr-2 w-4 h-4" />
          Abrir el PDF
        </a>

        <p className="mt-3 text-sm md:hidden text-textTertiary">
          Se abre en una pestaña nueva, así no perdés lo que ya cargaste en
          esta.
        </p>
      </header>

      <div className="hidden mt-8 md:block">
        <iframe
          src={fileUrl}
          title={`${terms.title} — ${terms.audience}`}
          className="w-full rounded-lg border border-gray-200 h-[80vh]"
        />
      </div>
    </article>
  )
}
