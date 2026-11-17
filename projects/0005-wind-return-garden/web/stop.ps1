$ErrorActionPreference = 'Stop'
$runtimeDir = Join-Path (Split-Path $PSScriptRoot -Parent) '.runtime'
$recordFile = Join-Path $runtimeDir 'server.json'
if (-not (Test-Path -LiteralPath $recordFile)) { Write-Host '没有本启动器拥有的服务。'; exit 0 }
$record = Get-Content -LiteralPath $recordFile -Raw | ConvertFrom-Json
$taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($record.processId)" -ErrorAction SilentlyContinue
$expectedServer = Join-Path $PSScriptRoot 'server.mjs'
if (-not $taskProcess) { Write-Host '服务已经停止。'; exit 0 }
if ($taskProcess.Name -ne 'node.exe' -or -not $taskProcess.CommandLine.Contains($expectedServer) -or $record.serverFile -ne $expectedServer) {
    throw '进程身份与本项目服务不一致，未停止任何进程。'
}
Stop-Process -Id $record.processId
Write-Host '已停止风归小庭本地服务。'
