import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
})

let renderCounter = 0

export default function DiagramRenderer({ code, id }) {
  const containerRef = useRef(null)
  const [svgContent, setSvgContent] = useState('')
  const [renderError, setRenderError] = useState(null)

  useEffect(() => {
    if (!code) return
    let cancelled = false

    const render = async () => {
      try {
        renderCounter++
        const uniqueId = `${id}-${renderCounter}`
        const { svg } = await mermaid.render(uniqueId, code)
        if (!cancelled) {
          setSvgContent(svg)
          setRenderError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setRenderError(err.message || 'Mermaid render failed')
          setSvgContent('')
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [code, id])

  const downloadSvg = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${id}-diagram.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(code)
  }

  if (renderError) {
    return (
      <div className="render-error">
        <p className="render-error-msg">⚠ Mermaid render error: {renderError}</p>
        <pre className="code-block">{code}</pre>
      </div>
    )
  }

  return (
    <div className="diagram-renderer">
      <div
        ref={containerRef}
        className="mermaid-container"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      <div className="renderer-actions">
        <button className="action-btn" onClick={downloadSvg} disabled={!svgContent}>
          Download SVG
        </button>
        <button className="action-btn" onClick={copyCode}>
          Copy Code
        </button>
      </div>
    </div>
  )
}
