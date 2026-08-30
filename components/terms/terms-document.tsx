import type { TermsDocument } from '@/lib/terms'

type TermsDocumentViewProps = {
  terms: TermsDocument
}

export default function TermsDocumentView({ terms }: TermsDocumentViewProps) {
  return (
    <article className="px-4 py-10 mx-auto max-w-3xl sm:px-6 sm:py-16">
      <h1 className="text-3xl font-black">{terms.title}</h1>

      <p className="mt-2 text-sm text-textTertiary">
        {terms.audience} · Última actualización: {terms.updatedAt}
      </p>

      <div className="flex flex-col gap-8 mt-10">
        {terms.sections.map(section => (
          <section key={section.heading} className="flex flex-col gap-3">
            <h2 className="text-xl font-medium">{section.heading}</h2>

            {section.body.map(paragraph => (
              <p key={paragraph} className="leading-relaxed text-textTertiary">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  )
}
