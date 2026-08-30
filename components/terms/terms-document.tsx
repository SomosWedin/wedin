import type { TermsBlock, TermsDocument } from '@/lib/terms'

type TermsDocumentViewProps = {
  terms: TermsDocument
}

type RichTextPart = {
  id: string
  text: string
  bold: boolean
}

function parseRichText(text: string): RichTextPart[] {
  const parts: RichTextPart[] = []
  let offset = 0

  for (const chunk of text.split(/(\*\*[^*]+\*\*)/g)) {
    if (chunk) {
      const bold = chunk.startsWith('**') && chunk.endsWith('**')

      parts.push({
        id: `${offset}`,
        text: bold ? chunk.slice(2, -2) : chunk,
        bold,
      })
    }

    offset += chunk.length
  }

  return parts
}

function RichText({ text }: { text: string }) {
  return (
    <>
      {parseRichText(text).map(part =>
        part.bold ? (
          <strong key={part.id} className="font-semibold text-textPrimary">
            {part.text}
          </strong>
        ) : (
          <span key={part.id}>{part.text}</span>
        )
      )}
    </>
  )
}

function blockKey(block: TermsBlock) {
  if (block.type === 'paragraph') return block.text
  if (block.type === 'list') return block.items[0]
  return block.rows[0][0]
}

function Block({ block }: { block: TermsBlock }) {
  if (block.type === 'paragraph') {
    return (
      <p className="leading-relaxed text-textTertiary">
        <RichText text={block.text} />
      </p>
    )
  }

  if (block.type === 'list') {
    return (
      <ul className="flex flex-col gap-2 pl-4">
        {block.items.map(item => (
          <li key={item} className="leading-relaxed text-textTertiary">
            <RichText text={item} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 pr-4 font-medium text-left">{block.head[0]}</th>
            <th className="py-2 pl-4 font-medium text-right">
              {block.head[1]}
            </th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map(row => (
            <tr key={row[0]} className="border-b border-gray-100">
              <td className="py-2 pr-4 text-textTertiary">{row[0]}</td>
              <td className="py-2 pl-4 text-right whitespace-nowrap">
                {row[1]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TermsDocumentView({ terms }: TermsDocumentViewProps) {
  return (
    <article className="px-4 py-10 mx-auto max-w-3xl sm:px-6 sm:py-16">
      <header className="pb-8 border-b border-gray-200">
        <p className="text-sm font-medium tracking-wide uppercase text-primary400">
          {terms.audience}
        </p>

        <h1 className="mt-2 text-3xl font-black">{terms.title}</h1>

        <p className="mt-3 text-sm text-textTertiary">
          Última actualización: {terms.updatedAt} · {terms.effectiveFrom}
        </p>
      </header>

      <div className="flex flex-col gap-10 mt-10">
        {terms.sections.map(section => (
          <section key={section.heading} className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{section.heading}</h2>

            {section.blocks.map(block => (
              <Block key={blockKey(block)} block={block} />
            ))}
          </section>
        ))}
      </div>
    </article>
  )
}
