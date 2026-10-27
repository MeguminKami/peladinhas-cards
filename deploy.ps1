[CmdletBinding()]
param(
    [switch]$Simular,
    [switch]$Inicializar
)

$ErrorActionPreference = 'Stop'
$previousTimeout = $env:FUNCTIONS_DISCOVERY_TIMEOUT
$deployExitCode = 1

Push-Location -LiteralPath $PSScriptRoot
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw 'Node.js nao encontrado. Instala as dependencias conforme DEPLOY.md.'
    }

    $env:FUNCTIONS_DISCOVERY_TIMEOUT = '60'
    $trackerArguments = @('scripts/deploy-tracker.mjs', 'auto')
    if ($Simular) { $trackerArguments += '--preview' }
    if ($Inicializar) { $trackerArguments += '--initialize' }

    Write-Host 'Peladinhas Cards - deploy automatico' -ForegroundColor Cyan
    if (-not $Simular) {
        Write-Host 'Este comando publica as pendencias. Nao alteres codigo ate terminar.'
    }
    & node @trackerArguments
    $deployExitCode = $LASTEXITCODE
    if ($deployExitCode -ne 0) {
        Write-Host 'Parou com erro. Resolve a causa e volta a executar .\deploy.ps1. Nao ha retries automaticos.' -ForegroundColor Yellow
    }
}
catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
}
finally {
    $env:FUNCTIONS_DISCOVERY_TIMEOUT = $previousTimeout
    Pop-Location
}

exit $deployExitCode
