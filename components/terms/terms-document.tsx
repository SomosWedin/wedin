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
          className="inline-block mt-6 text-sm font-semibold underline md:hidden"
        >
          Leer el documento
        </a>
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
