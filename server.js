require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── LLM Configuration ──────────────────────────────────────────────────────

// Provider selection: set LLM_PROVIDER to 'anthropic', 'gemini', 'groq', or 'bedrock'.
// Defaults to whichever key is present, preferring gemini → anthropic → groq → bedrock.
const LLM_PROVIDER = process.env.LLM_PROVIDER || (
  process.env.GEMINI_API_KEY    ? 'gemini'    :
  process.env.ANTHROPIC_API_KEY ? 'anthropic' :
  process.env.GROQ_API_KEY      ? 'groq'      :
  process.env.USE_BEDROCK === 'true' ? 'bedrock' : null
);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY    = process.env.GEMINI_API_KEY;
const GROQ_API_KEY      = process.env.GROQ_API_KEY;
const AWS_REGION        = process.env.AWS_REGION || 'us-east-1';

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const BEDROCK_MODEL   = 'anthropic.claude-sonnet-4-20250514-v1:0';
const GEMINI_MODEL    = 'gemini-2.0-flash';
const GROQ_MODEL      = 'llama-3.3-70b-versatile';

async function callLLM(systemPrompt, userMessage) {
  if (!LLM_PROVIDER) {
    throw new Error(
      'No LLM provider configured. Add one of the following to your .env file:\n' +
      '  GEMINI_API_KEY=...    (free at aistudio.google.com)\n' +
      '  ANTHROPIC_API_KEY=...\n' +
      '  GROQ_API_KEY=...      (free at console.groq.com)\n' +
      '  USE_BEDROCK=true      (requires AWS credentials)'
    );
  }

  if (LLM_PROVIDER === 'gemini') {
    const { GoogleGenAI } = require('@google/genai');
    const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const result = await genai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `${systemPrompt}\n\n${userMessage}`,
    });
    return result.text;
  }

  if (LLM_PROVIDER === 'groq') {
    const resp = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage  },
        ],
        max_tokens: 4096,
      },
      { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    return resp.data.choices[0].message.content;
  }

  if (LLM_PROVIDER === 'bedrock') {
    const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
    const client = new BedrockRuntimeClient({ region: AWS_REGION });
    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const cmd = new InvokeModelCommand({ modelId: BEDROCK_MODEL, body, contentType: 'application/json', accept: 'application/json' });
    const resp = await client.send(cmd);
    const parsed = JSON.parse(Buffer.from(resp.body).toString());
    return parsed.content[0].text;
  }

  // anthropic (default)
  const resp = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    },
    {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );
  return resp.data.content[0].text;
}

function cleanMermaid(raw) {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:mermaid|[^\n]*)?\n?/, '').replace(/\n?```$/, '');
  }
  return s.trim();
}

// ── Static Data ────────────────────────────────────────────────────────────

const DIAGRAM_TYPES = {
  dataflow:  'Data Flow Diagram',
  usecase:   'Use Case Diagram',
  sequence:  'Sequence Diagram',
  flowchart: 'Flowchart',
  class:     'Class Diagram',
  state:     'State Diagram',
  er:        'ER Diagram',
  component: 'Component Diagram',
};

const CODE_GEN_CONFIG = {
  class:     { label: 'Class Diagram',     languages: ['Java', 'Python', 'TypeScript', 'C++', 'Go'] },
  er:        { label: 'ER Diagram',        languages: ['PostgreSQL', 'MySQL', 'DynamoDB (CDK)', 'MongoDB (Mongoose)', 'SQLite'] },
  state:     { label: 'State Diagram',     languages: ['TypeScript (State Machine)', 'Python (transitions)', 'Java (Spring StateMachine)', 'Go (fsm)', 'Rust (enum)'] },
  component: { label: 'Component Diagram', languages: ['Terraform', 'AWS CDK (TypeScript)', 'Docker Compose', 'Kubernetes YAML', 'Pulumi (TypeScript)'] },
  dataflow:  { label: 'Data Flow Diagram', languages: ['Apache Airflow (Python)', 'AWS Step Functions (JSON)', 'Node.js Streams', 'Kafka Topology (Java)', 'Luigi (Python)'] },
  flowchart: { label: 'Flowchart',         languages: ['Python (function stubs)', 'TypeScript (function stubs)', 'Bash (script skeleton)', 'Java (method stubs)', 'Go (function stubs)'] },
};

const MERMAID_SYNTAX = {
  dataflow:  'flowchart TD (use labeled nodes and arrows to show data movement)',
  usecase:   'graph TD with actors on left and use cases in rounded rectangles',
  sequence:  'sequenceDiagram',
  flowchart: 'flowchart TD',
  class:     'classDiagram',
  state:     'stateDiagram-v2',
  er:        'erDiagram',
  component: 'graph TD (use subgraphs for system boundaries)',
};

// ── API Endpoints ──────────────────────────────────────────────────────────

app.get('/api/diagram-types', (req, res) => {
  res.json(DIAGRAM_TYPES);
});

app.get('/api/code-gen-config', (req, res) => {
  res.json(CODE_GEN_CONFIG);
});

app.post('/api/generate', async (req, res) => {
  try {
    const { input, inputType, diagramTypes } = req.body;
    if (!input || !diagramTypes || diagramTypes.length === 0) {
      return res.status(400).json({ error: 'input and diagramTypes are required' });
    }

    let textContent = input;
    if (inputType === 'url') {
      const { data: html } = await axios.get(input, { timeout: 10000 });
      const $ = cheerio.load(html);
      $('script, style, nav, footer, header').remove();
      textContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);
    }

    const diagrams = {};
    for (const type of diagramTypes) {
      const syntaxHint = MERMAID_SYNTAX[type] || 'flowchart TD';
      const systemPrompt = `You are a Mermaid.js diagram expert. Output ONLY valid Mermaid.js diagram code — no markdown code fences, no explanations, no comments outside the diagram.
Diagram type: ${DIAGRAM_TYPES[type]}
Mermaid syntax to use: ${syntaxHint}
Rules:
- Start directly with the Mermaid keyword (e.g. flowchart, classDiagram, sequenceDiagram, etc.)
- Use descriptive, meaningful node labels
- Keep it concise but complete
- Do NOT wrap in backticks or markdown fences`;

      const raw = await callLLM(systemPrompt, `Generate a ${DIAGRAM_TYPES[type]} from this content:\n\n${textContent}`);
      diagrams[type] = cleanMermaid(raw);
    }

    res.json({ diagrams });
  } catch (err) {
    console.error('Generate error:', err.message);
    if (err.response) console.error('Generate error body:', JSON.stringify(err.response.data));
    res.status(500).json({ error: err.message || 'Failed to generate diagrams' });
  }
});

app.post('/api/iterate', async (req, res) => {
  try {
    const { diagramType, currentCode, feedback, allDiagrams, originalInput } = req.body;

    const systemPrompt = `You are a Mermaid.js diagram expert. Output ONLY valid Mermaid.js diagram code — no markdown fences, no explanations.
Diagram type: ${DIAGRAM_TYPES[diagramType]}
Apply the user's feedback to update the diagram. Keep all existing elements unless the feedback says to remove them.
Do NOT wrap in backticks or markdown fences.`;

    const raw = await callLLM(
      systemPrompt,
      `Current diagram code:\n${currentCode}\n\nUser feedback:\n${feedback}`
    );
    const updatedCode = cleanMermaid(raw);

    // Second LLM call: consistency check
    let warnings = {};
    const otherDiagrams = Object.entries(allDiagrams)
      .filter(([t]) => t !== diagramType)
      .map(([t, code]) => `${DIAGRAM_TYPES[t]}:\n${code}`)
      .join('\n\n---\n\n');

    if (otherDiagrams) {
      try {
        const consistencySystem = `You are a technical diagram reviewer. Check if the updated diagram is consistent with the other diagrams.
Respond ONLY with valid JSON in this exact format: {"affected": {"diagram-type-key": "brief explanation"}}
If there are no inconsistencies, respond with: {"affected": {}}
Diagram type keys: ${Object.keys(DIAGRAM_TYPES).join(', ')}`;

        const consistencyRaw = await callLLM(
          consistencySystem,
          `Updated ${DIAGRAM_TYPES[diagramType]}:\n${updatedCode}\n\nOther diagrams:\n${otherDiagrams}`
        );

        let jsonStr = consistencyRaw.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const parsed = JSON.parse(jsonStr);
        warnings = parsed.affected || {};
      } catch {
        // Consistency check failed gracefully — skip warnings
      }
    }

    res.json({ updatedCode, warnings });
  } catch (err) {
    console.error('Iterate error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to iterate diagram' });
  }
});

app.post('/api/generate-code', async (req, res) => {
  try {
    const { diagramType, diagramCode, language } = req.body;

    const systemPrompt = `You are an expert software engineer. Generate complete, production-ready ${language} code from a Mermaid.js ${DIAGRAM_TYPES[diagramType]}.
Rules:
- Include all necessary imports and boilerplate
- Use proper language conventions and naming patterns
- Make the code immediately runnable / compilable
- Add schema/table definitions for ER diagrams with appropriate indexes
- For infrastructure code, include all required resource dependencies
- Do NOT wrap in markdown fences — output raw code only`;

    const raw = await callLLM(
      systemPrompt,
      `Generate ${language} code from this ${DIAGRAM_TYPES[diagramType]}:\n\n${diagramCode}`
    );

    let code = raw.trim();
    if (code.startsWith('```')) {
      code = code.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');
    }

    res.json({ code, language, diagramType });
  } catch (err) {
    console.error('Code gen error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate code' });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Diagram Generator API running at http://localhost:${PORT}`);
  console.log(`[LLM] provider=${LLM_PROVIDER || 'NONE'}`);
  console.log(`[LLM] ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY ? ANTHROPIC_API_KEY.slice(0, 16) + '...' : 'not set'}`);
  console.log(`[LLM] GEMINI_API_KEY=${GEMINI_API_KEY ? GEMINI_API_KEY.slice(0, 8) + '...' : 'not set'}`);
  console.log(`[LLM] .env path=${require('path').join(__dirname, '.env')}`);
  if (!LLM_PROVIDER) {
    console.warn('\n⚠️  WARNING: No LLM configured. Add GEMINI_API_KEY or ANTHROPIC_API_KEY to .env\n');
  }
});
