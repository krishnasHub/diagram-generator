import { useState, useEffect } from 'react'
import axios from 'axios'

const EXT_MAP = {
  'Java': 'java',
  'Python': 'py', 'Python (function stubs)': 'py', 'Python (transitions)': 'py',
  'Apache Airflow (Python)': 'py', 'Luigi (Python)': 'py',
  'TypeScript': 'ts', 'TypeScript (function stubs)': 'ts',
  'TypeScript (State Machine)': 'ts', 'AWS CDK (TypeScript)': 'ts',
  'Pulumi (TypeScript)': 'ts',
  'C++': 'cpp',
  'Go': 'go', 'Go (function stubs)': 'go', 'Go (fsm)': 'go',
  'PostgreSQL': 'sql', 'MySQL': 'sql', 'SQLite': 'sql',
  'DynamoDB (CDK)': 'ts',
  'MongoDB (Mongoose)': 'js',
  'Java (Spring StateMachine)': 'java', 'Java (method stubs)': 'java',
  'Kafka Topology (Java)': 'java',
  'Rust (enum)': 'rs',
  'Terraform': 'tf',
  'Docker Compose': 'yml',
  'Kubernetes YAML': 'yaml',
  'AWS Step Functions (JSON)': 'json',
  'Node.js Streams': 'js',
  'Bash (script skeleton)': 'sh',
}

export default function CodeGenerator({ diagramType, diagramCode }) {
  const [config, setConfig] = useState(null)
  const [generatedCode, setGeneratedCode] = useState({})
  const [generating, setGenerating] = useState(null)
  const [activeLanguage, setActiveLanguage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios.get('/api/code-gen-config').then(({ data }) => {
      setConfig(data)
    }).catch(() => {})
  }, [])

  if (!config || !config[diagramType]) return null

  const { languages } = config[diagramType]

  const generate = async (lang) => {
    if (generatedCode[lang]) {
      setActiveLanguage(lang)
      return
    }
    setGenerating(lang)
    setError(null)
    try {
      const { data } = await axios.post('/api/generate-code', {
        diagramType,
        diagramCode,
        language: lang,
      })
      setGeneratedCode(prev => ({ ...prev, [lang]: data.code }))
      setActiveLanguage(lang)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setGenerating(null)
    }
  }

  const copyCode = () => {
    if (activeLanguage && generatedCode[activeLanguage]) {
      navigator.clipboard.writeText(generatedCode[activeLanguage])
    }
  }

  const downloadCode = () => {
    if (!activeLanguage || !generatedCode[activeLanguage]) return
    const ext = EXT_MAP[activeLanguage] || 'txt'
    const blob = new Blob([generatedCode[activeLanguage]], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${diagramType}-${activeLanguage.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="code-generator">
      <h4 className="codegen-title">Generate Code</h4>
      <div className="lang-buttons">
        {languages.map(lang => (
          <button
            key={lang}
            className={`lang-btn ${activeLanguage === lang ? 'active' : ''} ${generatedCode[lang] ? 'has-code' : ''}`}
            onClick={() => generate(lang)}
            disabled={generating === lang}
          >
            {generating === lang && (
              <span className="spinner spinner-xs" style={{ marginRight: '4px' }} />
            )}
            {generatedCode[lang] && generating !== lang && (
              <span className="checkmark">✓ </span>
            )}
            {lang}
          </button>
        ))}
      </div>

      {error && (
        <p className="codegen-error">⚠ {error}</p>
      )}

      {activeLanguage && generatedCode[activeLanguage] && (
        <div className="codegen-output">
          <div className="codegen-output-header">
            <span className="codegen-lang-label">{activeLanguage}</span>
            <div className="codegen-output-actions">
              <button className="action-btn" onClick={copyCode}>Copy</button>
              <button className="action-btn" onClick={downloadCode}>Download</button>
            </div>
          </div>
          <pre className="code-block codegen-pre">{generatedCode[activeLanguage]}</pre>
        </div>
      )}
    </div>
  )
}
