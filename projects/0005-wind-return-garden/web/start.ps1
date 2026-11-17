$ErrorActionPreference = 'Stop'
$appRoot = $PSScriptRoot
$runtimeDir = Join-Path (Split-Path $appRoot -Parent) '.runtime'
try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:52845/health' -TimeoutSec 2
    if ($health.app -eq 'wind-return-garden') {
        Write-Host '风归小庭已运行：http://127.0.0.1:52845/'
        exit 0
    }
    throw '端口 52845 被其他服务占用。'
} catch {
    if ($_.Exception.Message -eq '端口 52845 被其他服务占用。') { throw }
}
$nodeExe = (Get-Command node -ErrorAction Stop).Source
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$serverFile = Join-Path $appRoot 'server.mjs'
$taskProcess = Start-Process -FilePath $nodeExe -ArgumentList @('"' + $serverFile + '"') -WorkingDirectory $appRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir 'server.log') -RedirectStandardError (Join-Path $runtimeDir 'server-error.log')
@{ processId=$taskProcess.Id; serverFile=$serverFile; port=52845 } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimeDir 'server.json') -Encoding utf8
$ready = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 150
    try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:52845/health' -TimeoutSec 1; if ($health.app -eq 'wind-return-garden') {$ready=$true;break} } catch {}
}
if (-not $ready) { throw '服务未就绪，请检查 .runtime/server-error.log。' }
Write-Host '风归小庭：http://127.0.0.1:52845/'
Write-Host '风的手记：http://127.0.0.1:52845/lab.html'
