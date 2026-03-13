import { cn } from "@/lib/utils"
import { useCallback } from "react"

export type CodeBlockProps = {
  children: React.ReactNode
  className?: string
}

function CodeBlock({ children, className }: CodeBlockProps) {
  return (
    <div className={cn("relative my-2 rounded-md bg-muted", className)}>
      {children}
    </div>
  )
}

export type CodeBlockCodeProps = {
  code: string
  language?: string
  className?: string
}

function CodeBlockCode({ code, language, className }: CodeBlockCodeProps) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).catch(() => {});
  }, [code]);

  return (
    <div className="relative group">
      {language && language !== 'plaintext' && (
        <div className="flex items-center justify-between px-3 py-1 text-10 text-muted-foreground border-b border-border/50">
          <span>{language}</span>
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 text-10 text-muted-foreground hover:text-foreground transition-opacity"
            aria-label="Copy code"
          >
            Copy
          </button>
        </div>
      )}
      <pre className={cn("overflow-x-auto p-3 text-11 leading-relaxed", className)}>
        <code className="font-mono text-foreground">{code}</code>
      </pre>
    </div>
  )
}

export { CodeBlock, CodeBlockCode }
