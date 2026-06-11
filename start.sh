#!/bin/bash
echo "==================================="
echo "  AI Diagram Generator"
echo "==================================="
echo ""
echo "Backend:  http://localhost:3002"
echo "Frontend: http://localhost:5174"
echo ""

if [ -z "$ANTHROPIC_API_KEY" ] && [ "$USE_BEDROCK" != "true" ]; then
  echo "WARNING: No LLM configured!"
  echo ""
  echo "Option 1 (Anthropic API):"
  echo "  export ANTHROPIC_API_KEY=sk-ant-..."
  echo ""
  echo "Option 2 (AWS Bedrock):"
  echo "  export USE_BEDROCK=true"
  echo "  (requires AWS credentials + @aws-sdk/client-bedrock-runtime)"
  echo ""
  echo "==================================="
  echo ""
fi

cleanup() {
  kill $SERVER_PID 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM

node server.js &
SERVER_PID=$!

cd client && npm run dev

cleanup
