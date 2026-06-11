import { useState, useRef } from 'react'
import DiagramRenderer from './DiagramRenderer'
import CodeGenerator from './CodeGenerator'

export default function DiagramPanel({ type, label, code, warning, isIterating, onIterate, onDismissWarning }) {
  const [feedback, setFeedback] = useState('')
  const textareaRef = useRef(null)

  const handleIterate = () => {
    if (!feedback.trim() || isIterating) return
    onIterate(feedback.trim())
    setFeedback('')
  }

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleIterate()
    }
  }

  return (
    <div className="diagram-panel">
      {warning && (
        <div className="warning-banner">
          <span className="warning-icon">⚠</span>
          <span className="warning-text">{warning}</span>
          <button className="warning-dismiss" onClick={onDismissWarning} aria-label="Dismiss">×</button>
        </div>
      )}

      <h3 className="panel-title">{label}</h3>

      {isIterating && (
        <div className="panel-loading">
          <span className="spinner spinner-sm" />
          <span>Updating diagram…</span>
        </div>
      )}

      <DiagramRenderer code={code} id={type} />

      <details className="mermaid-details">
        <summary className="mermaid-summary">View Mermaid Code</summary>
        <pre className="code-block mermaid-code">{code}</pre>
      </details>

      <CodeGenerator diagramType={type} diagramCode={code} />

      <div className="iterate-section">
        <label className="input-label">Refine this diagram</label>
        <textarea
          ref={textareaRef}
          className="input-field iterate-textarea"
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what to change… (Cmd+Enter to submit)"
          rows={3}
          disabled={isIterating}
        />
        <button
          className="iterate-btn"
          onClick={handleIterate}
          disabled={!feedback.trim() || isIterating}
        >
          {isIterating ? 'Updating…' : 'Iterate'}
        </button>
      </div>
    </div>
  )
}
