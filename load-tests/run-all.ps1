# ============================================================================
# StrataDesk Load Test Runner (PowerShell)
# ============================================================================
# Runs all phases sequentially with pauses between phases.
#
# Usage:
#   $env:BASE_URL = "http://your-ec2-ip:3001"
#   $env:AUTH_TOKEN = "dev-token"
#   .\run-all.ps1
#
# Or run individual phases:
#   k6 run -e BASE_URL=http://your-ec2-ip:3001 -e AUTH_TOKEN=dev-token 01-baseline.js
# ============================================================================

$ErrorActionPreference = "Stop"

# Validate environment
if (-not $env:BASE_URL) {
    Write-Host "ERROR: BASE_URL not set" -ForegroundColor Red
    Write-Host "Usage: `$env:BASE_URL = 'http://your-ec2-ip:3001'" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  STRATADESK LOAD TEST SUITE — PART 5B" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Target:     $env:BASE_URL" -ForegroundColor White
Write-Host "  Auth Token: $(if ($env:AUTH_TOKEN) { 'SET' } else { 'USING DEFAULT' })" -ForegroundColor White
Write-Host "  Started:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure logs directory exists
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "Created logs/ directory" -ForegroundColor Gray
}

# Capture backend logs before testing (Change #7)
Write-Host "Capturing pre-test backend logs..." -ForegroundColor Gray
try {
    docker logs stratadesk-backend --tail 100 2>&1 | Out-File "logs\backend-pre-test.log" -Encoding UTF8
    Write-Host "  Saved to logs\backend-pre-test.log" -ForegroundColor Gray
} catch {
    Write-Host "  Could not capture backend logs (Docker not local?)" -ForegroundColor Yellow
}

function Run-Phase {
    param(
        [string]$Name,
        [string]$Script,
        [int]$PauseSeconds = 30
    )

    Write-Host ""
    Write-Host "────────────────────────────────────────" -ForegroundColor Yellow
    Write-Host "  PHASE: $Name" -ForegroundColor Yellow
    Write-Host "  Script: $Script" -ForegroundColor Gray
    Write-Host "  Time: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
    Write-Host "────────────────────────────────────────" -ForegroundColor Yellow
    Write-Host ""

    k6 run $Script

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  ⚠ Phase completed with exit code $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "  (This may be expected — load tests can fail thresholds)" -ForegroundColor Gray
    }

    if ($PauseSeconds -gt 0) {
        Write-Host ""
        Write-Host "  Cooling down for ${PauseSeconds}s before next phase..." -ForegroundColor Gray
        Start-Sleep -Seconds $PauseSeconds
    }
}

# ── Phase 2: Baseline ──
Run-Phase -Name "BASELINE (100 VUs × 2 min)" -Script "01-baseline.js" -PauseSeconds 30

# ── Phase 3: Moderate ──
Run-Phase -Name "MODERATE (500 VUs × 5 min)" -Script "02-moderate.js" -PauseSeconds 30

# ── Phase 4a: Read Heavy ──
Run-Phase -Name "READ HEAVY (1000 VUs × 5 min)" -Script "03a-read-heavy.js" -PauseSeconds 30

# ── Phase 4b: Write Heavy ──
Run-Phase -Name "WRITE HEAVY (1000 VUs × 5 min)" -Script "03b-write-heavy.js" -PauseSeconds 30

# ── Phase 4c: Combined Heavy ──
Run-Phase -Name "COMBINED HEAVY (1000 VUs × 5 min)" -Script "03-heavy.js" -PauseSeconds 60

# ── Phase 5: Chaos ──
Run-Phase -Name "CHAOS (→ 10000 VUs × 15 min max)" -Script "04-chaos.js" -PauseSeconds 10

# ── Phase 7: Recovery ──
Run-Phase -Name "RECOVERY (polling for up to 5 min)" -Script "05-recovery.js" -PauseSeconds 0

# Capture backend logs after testing (Change #7)
Write-Host ""
Write-Host "Capturing post-test backend logs..." -ForegroundColor Gray
try {
    docker logs stratadesk-backend --tail 500 2>&1 | Out-File "logs\backend-post-test.log" -Encoding UTF8
    Write-Host "  Saved to logs\backend-post-test.log" -ForegroundColor Gray
} catch {
    Write-Host "  Could not capture backend logs (Docker not local?)" -ForegroundColor Yellow
}

# ── Done ──
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  ALL PHASES COMPLETE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Finished:  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "  Logs:      load-tests\logs\" -ForegroundColor White
Write-Host ""
Write-Host "  NEXT STEPS:" -ForegroundColor White
Write-Host "  1. Review JSON results in logs\" -ForegroundColor Gray
Write-Host "  2. Check Grafana dashboards" -ForegroundColor Gray
Write-Host "  3. Review docker stats CSV" -ForegroundColor Gray
Write-Host "  4. Fill in load-test-report-template.md" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Green
