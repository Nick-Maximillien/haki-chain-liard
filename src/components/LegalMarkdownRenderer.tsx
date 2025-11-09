import { useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import type { Components } from "react-markdown"

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), ["className", "language-*"]],
    span: [...(defaultSchema.attributes?.span || []), "className"],
    th: [...(defaultSchema.attributes?.th || []), "align"],
    td: [...(defaultSchema.attributes?.td || []), "align"],
  },
}

const components: Components = {
  h1: ({ children }) => <h1 className="legal-heading legal-heading-1">{children}</h1>,
  h2: ({ children }) => <h2 className="legal-heading legal-heading-2">{children}</h2>,
  h3: ({ children }) => <h3 className="legal-heading legal-heading-3">{children}</h3>,
  h4: ({ children }) => <h4 className="legal-heading legal-heading-4">{children}</h4>,
  p: ({ children }) => <p className="legal-paragraph">{children}</p>,
  strong: ({ children }) => <strong className="legal-strong">{children}</strong>,
  em: ({ children }) => <em className="legal-em">{children}</em>,
  ul: ({ children }) => <ul className="legal-list legal-list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="legal-list legal-list-decimal">{children}</ol>,
  li: ({ children }) => <li className="legal-list-item">{children}</li>,
  blockquote: ({ children }) => <blockquote className="legal-blockquote">{children}</blockquote>,
  table: ({ children }) => <div className="legal-table-wrapper"><table className="legal-table">{children}</table></div>,
  thead: ({ children }) => <thead className="legal-table-head">{children}</thead>,
  tbody: ({ children }) => <tbody className="legal-table-body">{children}</tbody>,
  tr: ({ children }) => <tr className="legal-table-row">{children}</tr>,
  th: ({ children }) => <th className="legal-table-heading">{children}</th>,
  td: ({ children }) => <td className="legal-table-cell">{children}</td>,
  code: ({ inline, className, children }) => {
    if (inline) {
      return <code className="legal-code-inline">{children}</code>
    }
    return (
      <pre className="legal-code-block">
        <code className={className}>{children}</code>
      </pre>
    )
  },
  hr: () => <hr className="legal-divider" />,
}

interface LegalMarkdownRendererProps {
  content: string
  className?: string
}

export function LegalMarkdownRenderer({ content, className }: LegalMarkdownRendererProps) {
  const safeContent = useMemo(() => content?.trim() ?? "", [content])

  if (!safeContent) {
    return null
  }

  return (
    <div className={`legal-typography ${className || ""}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={components}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  )
}
