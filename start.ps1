# AI Diagram Generator — Windows PowerShell launcher
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  AI Diagram Generator" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:3002"
Write-Host "Frontend: http://localhost:5174"
Write-Host ""

if (-not $env:ANTHROPIC_API_KEY -and $env:USE_BEDROCK -ne 'true') {
  Write-Host "WARNING: No LLM configured!" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Option 1 (Anthropic API):" -ForegroundColor Yellow
  Write-Host '  $env:ANTHROPIC_API_KEY = "sk-ant-..."' -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Option 2 (AWS Bedrock):" -ForegroundColor Yellow
  Write-Host '  $env:USE_BEDROCK = "true"' -ForegroundColor Yellow
  Write-Host ""
  Write-Host "===================================" -ForegroundColor Yellow
  Write-Host ""
}

# Kill any stale process on port 3002 before starting
$stale = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($stale) { Stop-Process -Id $stale -Force -ErrorAction SilentlyContinue }

$serverJob = Start-Job -ScriptBlock { node "$using:PWD\server.js" }

try {
  Push-Location client
  npm run dev
} finally {
  Stop-Job $serverJob
  Remove-Job $serverJob
  Pop-Location
}
