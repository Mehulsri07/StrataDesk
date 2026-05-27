# ============================================================================
# Docker Stats Capture Script (Change #4)
# ============================================================================
# Run this in a SEPARATE terminal during load tests.
# Captures container-level CPU/RAM/Network/Disk every 2 seconds.
#
# Usage:
#   .\capture-docker-stats.ps1
#   .\capture-docker-stats.ps1 -Duration 300  (5 minutes)
#
# Output: logs/docker-stats-<timestamp>.csv
# ============================================================================

param(
    [int]$Duration = 600,          # Default: 10 minutes
    [int]$IntervalSeconds = 2      # Sample every 2 seconds
)

$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$outputFile = "logs\docker-stats-$timestamp.csv"

# Ensure logs directory exists
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Docker Stats Capture" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Duration:  $Duration seconds"
Write-Host "  Interval:  $IntervalSeconds seconds"
Write-Host "  Output:    $outputFile"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# CSV header
"Timestamp,Container,CPU%,MemUsage,MemLimit,Mem%,NetI,NetO,BlockI,BlockO,PIDs" | Out-File $outputFile -Encoding UTF8

$elapsed = 0
$samples = 0

while ($elapsed -lt $Duration) {
    $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    try {
        # Capture docker stats snapshot (no-stream = single snapshot)
        $stats = docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}" 2>&1

        if ($LASTEXITCODE -eq 0) {
            foreach ($line in $stats) {
                if ($line -and $line.Trim()) {
                    # Parse the CSV line
                    $parts = $line -split ","
                    if ($parts.Count -ge 7) {
                        $container = $parts[0].Trim()
                        $cpu = $parts[1].Trim()
                        $memUsage = ($parts[2].Trim() -split "/")[0].Trim()
                        $memLimit = ($parts[2].Trim() -split "/")[1].Trim()
                        $memPct = $parts[3].Trim()
                        $netIO = $parts[4].Trim() -split "/"
                        $netI = $netIO[0].Trim()
                        $netO = if ($netIO.Count -gt 1) { $netIO[1].Trim() } else { "0B" }
                        $blockIO = $parts[5].Trim() -split "/"
                        $blockI = $blockIO[0].Trim()
                        $blockO = if ($blockIO.Count -gt 1) { $blockIO[1].Trim() } else { "0B" }
                        $pids = $parts[6].Trim()

                        "$now,$container,$cpu,$memUsage,$memLimit,$memPct,$netI,$netO,$blockI,$blockO,$pids" |
                            Out-File $outputFile -Append -Encoding UTF8
                    }
                }
            }
            $samples++

            # Print summary every 10 samples
            if ($samples % 5 -eq 0) {
                Write-Host "[$now] Captured $samples samples ($elapsed`s elapsed)" -ForegroundColor Gray
            }
        } else {
            Write-Host "[$now] docker stats failed — is Docker running?" -ForegroundColor Red
        }
    } catch {
        Write-Host "[$now] Error: $_" -ForegroundColor Red
    }

    Start-Sleep -Seconds $IntervalSeconds
    $elapsed += $IntervalSeconds
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Capture complete!" -ForegroundColor Green
Write-Host "  Total samples: $samples" -ForegroundColor Green
Write-Host "  Output: $outputFile" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
