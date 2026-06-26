# AASHA Benchmark Suite Automation Runner
# Starts the Spring Boot backend, generates baseline datasets, runs k6 scripts, executes sync tests, and logs performance telemetry.

$ErrorActionPreference = "Stop"

$API_BASE = "http://localhost:8080"
$K6_BIN = "C:\Program Files\k6\k6.exe"

# 1. Start Spring Boot in the background
Write-Host "=== 1. Starting AASHA Spring Boot Backend ===" -ForegroundColor Cyan
$BackendJob = Start-Job -ScriptBlock {
    $env:PGHOST="localhost"
    $env:PGPORT="5432"
    $env:PGDATABASE="postgres"
    $env:PGUSER="postgres"
    $env:PGPASSWORD="postgres"
    Set-Location "c:\Github\AASHA\backend"
    .\mvnw.cmd spring-boot:run
}

# 2. Wait for backend to be healthy
$Healthy = $false
$Attempts = 0
$MaxAttempts = 30

do {
    try {
        $res = Invoke-RestMethod -Uri "$API_BASE/api/healthz"
        if ($res.status -eq "ok") {
            $Healthy = $true
        }
    } catch {
        # Expected connection failures while starting
    }
    if (-not $Healthy) {
        Write-Host "Waiting for backend to start (attempt $Attempts/$MaxAttempts)..."
        Start-Sleep -Seconds 2
        $Attempts++
    }
} while (-not $Healthy -and $Attempts -lt $MaxAttempts)

if (-not $Healthy) {
    Write-Error "Backend failed to start in time. Aborting benchmarks."
}
Write-Host "Backend is healthy and listening on port 8080." -ForegroundColor Green

# 3. Generate baseline benchmark records
Write-Host "`n=== 2. Generating Baseline Benchmark Dataset (1,000 records) ===" -ForegroundColor Cyan
try {
    $genRes = Invoke-RestMethod -Method Post -Uri "$API_BASE/api/benchmark/generate?count=1000"
    Write-Host "Generated $($genRes.count) records: $($genRes.message)" -ForegroundColor Green
} catch {
    Write-Warning "Could not seed data: $_"
}

# 4. Run Sync Benchmarks (Node.js)
Write-Host "`n=== 3. Executing Offline Sync Benchmarks ===" -ForegroundColor Cyan
Set-Location "c:\Github\AASHA\benchmarks\scripts"
node sync-bench.js

# 5. Run k6 Load Tests for GET, POST, and Sync at multiple scales
Write-Host "`n=== 4. Executing k6 Concurrency Benchmark Workloads ===" -ForegroundColor Cyan
$Scales = @("scale_10", "scale_50", "scale_100", "scale_250") # 500 VUs skipped in quick run to avoid socket starvation

foreach ($scale in $Scales) {
    Write-Host "`n---> Running mixed-workload benchmark at $scale..." -ForegroundColor Yellow
    $envVars = @{
        "WORKLOAD_SCALE" = $scale
        "API_BASE_URL" = $API_BASE
    }
    
    # Run k6 mixed-workload and export to JSON
    $ReportName = "c:\Github\AASHA\benchmarks\reports\mixed_workload_${scale}_results.json"
    $envString = ""
    $envVars.Keys | ForEach-Object { $envString += "-e $_=$($envVars[$_]) " }
    
    # Execute k6
    $cmd = "& `"$K6_BIN`" run c:\Github\AASHA\benchmarks\k6\mixed-workload.js $envString --summary-export=$ReportName"
    Invoke-Expression $cmd
}

# 6. Run k6 Stress Test to find breaking point
Write-Host "`n=== 5. Executing k6 API Stress Test ===" -ForegroundColor Cyan
$StressReport = "c:\Github\AASHA\benchmarks\reports\api_stress_test_results.json"
$cmdStress = "& `"$K6_BIN`" run c:\Github\AASHA\benchmarks\k6\stress.js -e API_BASE_URL=$API_BASE --summary-export=$StressReport"
Invoke-Expression $cmdStress

# 7. Collect Actuator/Prometheus Telemetry Snapshots
Write-Host "`n=== 6. Extracting JVM Actuator Telemetry Snapshots ===" -ForegroundColor Cyan
try {
    $prometheusMetrics = Invoke-RestMethod -Uri "$API_BASE/actuator/prometheus"
    Out-File -FilePath "c:\Github\AASHA\benchmarks\reports\prometheus_metrics_snapshot.txt" -InputObject $prometheusMetrics
    Write-Host "Saved Prometheus metrics snapshot." -ForegroundColor Green
} catch {
    Write-Warning "Could not retrieve Actuator metrics: $_"
}

# 8. Clean up backend background processes
Write-Host "`n=== 7. Shutting down Backend Server ===" -ForegroundColor Cyan
Stop-Job -Job $BackendJob
Remove-Job -Job $BackendJob

# Force close any remaining Java processes running the spring boot application
$springBootProcess = Get-Process -Name "java" -ErrorAction SilentlyContinue
if ($springBootProcess) {
    $springBootProcess | Stop-Process -Force
}
Write-Host "Backend server stopped cleanly. Benchmark suite run complete." -ForegroundColor Green
