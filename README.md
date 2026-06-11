# AI Diagram Generator

Convert a plain-English technical description (or a URL to a design doc) into a set of interactive Mermaid.js diagrams — Data Flow, Sequence, Flowchart, Class, ER, State, Use Case, and Component — with one click. Each diagram is editable via natural-language feedback, and you can generate production-ready code (SQL, Terraform, TypeScript, Python, etc.) directly from any diagram.

---

## Features

- **8 diagram types** rendered live in the browser via Mermaid.js
- **Text or URL input** — paste a description or point it at a wiki/design doc
- **Iterate with feedback** — type what to change and the diagram updates
- **Consistency warnings** — if you edit one diagram in a way that conflicts with others, you'll be told
- **Code generation** — turn any diagram into runnable code in your chosen language
- **Multi-provider LLM support** — Anthropic Claude, Google Gemini (free tier), Groq (free tier), or AWS Bedrock

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | 18 or later | Powers the backend server and Vite dev server |
| An LLM API key | — | See options below — at least one is required |

### LLM provider options (pick one)

| Provider | Cost | Where to get a key |
|---|---|---|
| **Google Gemini** | Free tier (15 req/min, 1 M tokens/day) | [aistudio.google.com](https://aistudio.google.com) → Get API key |
| **Groq** | Free tier (fast Llama models) | [console.groq.com](https://console.groq.com) |
| **Anthropic Claude** | Paid | [console.anthropic.com](https://console.anthropic.com) |
| **AWS Bedrock** | Paid (AWS account) | Configure AWS credentials + enable Claude on Bedrock |

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/krishnasHub/diagram-generator.git
cd diagram-generator
```

### 2. Install dependencies

```bash
# Backend
npm install

# Frontend
cd client && npm install && cd ..
```

### 3. Configure your API key

Copy the example env file and fill in your key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Google Gemini (recommended — free tier)
GEMINI_API_KEY=your_key_here

# Or Anthropic Claude
# ANTHROPIC_API_KEY=sk-ant-...

# Or Groq
# GROQ_API_KEY=gsk_...

# Or AWS Bedrock
# USE_BEDROCK=true
# AWS_REGION=us-east-1
```

The server auto-detects whichever key is present. If you set multiple, the priority is: Gemini → Anthropic → Groq → Bedrock. You can override this by setting `LLM_PROVIDER=anthropic` (or `gemini`, `groq`, `bedrock`) explicitly.

---

## Running

### Windows

```powershell
.\start.ps1
```

### macOS / Linux

```bash
./start.sh
```

Both scripts start the backend on **port 3002** and the Vite frontend on **port 5174**, then open your default browser automatically.

Alternatively, start them separately:

```bash
# Terminal 1 — backend
node server.js

# Terminal 2 — frontend
cd client && npm run dev
```

---

## Project structure

```
diagram-generator/
├── server.js          # Express API — LLM calls, diagram generation, code gen
├── client/
│   ├── src/
│   │   ├── App.jsx                        # Main app shell, input, generate flow
│   │   └── components/
│   │       ├── DiagramPanel.jsx           # Per-diagram panel with Mermaid renderer
│   │       ├── DiagramRenderer.jsx        # Mermaid.js rendering wrapper
│   │       └── CodeGenerator.jsx          # Language selector + code output
│   └── vite.config.js                     # Vite config (proxies /api → :3002)
├── .env.example       # Template for environment variables
├── start.ps1          # Windows launcher
└── start.sh           # macOS/Linux launcher
```

---

## Environment variables reference

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `GROQ_API_KEY` | Groq API key |
| `USE_BEDROCK` | Set to `true` to use AWS Bedrock instead |
| `AWS_REGION` | AWS region for Bedrock (default: `us-east-1`) |
| `LLM_PROVIDER` | Force a specific provider: `gemini`, `anthropic`, `groq`, or `bedrock` |
