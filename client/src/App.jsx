import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import DiagramPanel from './components/DiagramPanel'
import './App.css'

const LOADING_MESSAGES = [
  'Consulting the diagram spirits…',
  'Turning chaos into rectangles…',
  'Teaching boxes to talk to each other…',
  'Bribing the arrows into alignment…',
  'Untangling your architecture…',
  'Making UML actually useful…',
  'Herding your components into shape…',
  'Translating human to diagram…',
  'Wrangling dependencies…',
  'Connecting the dots — literally…',
  'Squinting at your requirements…',
  'Reverse-engineering your genius…',
]

function useCyclingMessage(active, interval = 2400) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!active) { setIndex(0); setVisible(true); return }
    timerRef.current = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % LOADING_MESSAGES.length)
        setVisible(true)
      }, 300)
    }, interval)
    return () => clearInterval(timerRef.current)
  }, [active, interval])

  return { message: LOADING_MESSAGES[index], visible }
}

const ALL_TYPES = {
  dataflow:  'Data Flow',
  usecase:   'Use Case',
  sequence:  'Sequence',
  flowchart: 'Flowchart',
  class:     'Class',
  state:     'State',
  er:        'ER',
  component: 'Component',
}

export default function App() {
  const [input, setInput] = useState('')
  const [inputType, setInputType] = useState('text')
  const [selectedTypes, setSelectedTypes] = useState(['dataflow', 'sequence'])
  const [diagrams, setDiagrams] = useState({})
  const [warnings, setWarnings] = useState({})
  const [loading, setLoading] = useState(false)
  const [iteratingType, setIteratingType] = useState(null)
  const [error, setError] = useState(null)

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const generate = async () => {
    if (!input.trim() || selectedTypes.length === 0) return
    setLoading(true)
    setError(null)
    setDiagrams({})
    setWarnings({})
    try {
      const { data } = await axios.post('/api/generate', {
        input: input.trim(),
        inputType,
        diagramTypes: selectedTypes,
      })
      setDiagrams(data.diagrams)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate diagrams')
    } finally {
      setLoading(false)
    }
  }

  const iterate = async (type, feedback) => {
    setIteratingType(type)
    try {
      const { data } = await axios.post('/api/iterate', {
        diagramType: type,
        currentCode: diagrams[type],
        feedback,
        allDiagrams: diagrams,
        originalInput: input,
      })
      setDiagrams(prev => ({ ...prev, [type]: data.updatedCode }))
      if (data.warnings && Object.keys(data.warnings).length > 0) {
        setWarnings(prev => ({ ...prev, ...data.warnings }))
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to iterate diagram')
    } finally {
      setIteratingType(null)
    }
  }

  const dismissWarning = (type) => {
    setWarnings(prev => {
      const next = { ...prev }
      delete next[type]
      return next
    })
  }

  const hasDiagrams = Object.keys(diagrams).length > 0
  const { message: loadingMsg, visible: loadingVisible } = useCyclingMessage(loading)

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Diagram Generator</h1>
        <p>Convert technical text into interactive UML &amp; data flow diagrams — runs locally, no data leaves your machine</p>
      </header>

      <div className="input-section">
        <div className="input-toggle">
          <button
            className={`toggle-btn ${inputType === 'text' ? 'active' : ''}`}
            onClick={() => setInputType('text')}
          >
            Text
          </button>
          <button
            className={`toggle-btn ${inputType === 'url' ? 'active' : ''}`}
            onClick={() => setInputType('url')}
          >
            URL
          </button>
        </div>

        {inputType === 'text' ? (
          <>
            <label className="input-label">Paste your technical description, design doc, or architecture blurb</label>
            <textarea
              className="input-field"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. Our authentication service receives login requests from the web app. It validates credentials against a Postgres user table, creates a JWT token signed with our private key, and returns it. Failed logins are logged to Redis with a TTL-based rate limit..."
            />
          </>
        ) : (
          <>
            <label className="input-label">Enter a URL to a technical doc, wiki page, or design document</label>
            <input
              type="url"
              className="input-field"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="https://your-internal-wiki.example.com/design-doc"
            />
          </>
        )}
      </div>

      <div className="types-section">
        <h2>Diagram Types</h2>
        <div className="type-chips">
          {Object.entries(ALL_TYPES).map(([key, label]) => (
            <button
              key={key}
              className={`type-chip ${selectedTypes.includes(key) ? 'selected' : ''}`}
              onClick={() => toggleType(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        className="generate-btn"
        onClick={generate}
        disabled={loading || !input.trim() || selectedTypes.length === 0}
      >
        {loading
          ? <span className={`btn-loading-text ${loadingVisible ? 'fade-in' : 'fade-out'}`}>{loadingMsg}</span>
          : 'Generate Diagrams'
        }
      </button>

      {error && (
        <div className="error-box">
          <span className="error-icon">⚠</span>
          <div className="error-content">
            <strong>Error</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-section">
          <div className="spinner" />
          <h3 className={`loading-msg ${loadingVisible ? 'fade-in' : 'fade-out'}`}>
            {loadingMsg}
          </h3>
          <ul className="loading-steps">
            {selectedTypes.map((type) => (
              <li key={type} className="loading-step">
                → {ALL_TYPES[type]} Diagram
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasDiagrams && (
        <div className="diagrams-container">
          {selectedTypes
            .filter(type => diagrams[type])
            .map(type => (
              <DiagramPanel
                key={type}
                type={type}
                label={ALL_TYPES[type] + ' Diagram'}
                code={diagrams[type]}
                warning={warnings[type]}
                isIterating={iteratingType === type}
                onIterate={(feedback) => iterate(type, feedback)}
                onDismissWarning={() => dismissWarning(type)}
              />
            ))}
        </div>
      )}
    </div>
  )
}
