[CmdletBinding()]
param(
    [switch]$InstallDeps,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

if ($BackendOnly -and $FrontendOnly) {
    throw "-BackendOnly and -FrontendOnly cannot be used together."
}

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $projectRoot 'TongXin-server'
$frontendDir = Join-Path $projectRoot 'TongXin-web'

function Ensure-PathExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PathToCheck,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    if (-not (Test-Path -Path $PathToCheck)) {
        throw "$Label path not found: $PathToCheck"
    }
}

function Ensure-CommandExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandName
    )

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $CommandName"
    }
}

function Install-Dependencies {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorkDir,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    Write-Host "Installing dependencies for $Label ..."
    if ($DryRun) {
        return
    }

    Push-Location $WorkDir
    try {
        & npm.cmd install
    }
    finally {
        Pop-Location
    }
}

function Start-DevService {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [string]$WorkDir,
        [Parameter(Mandatory = $true)]
        [string]$Url
    )

    $escapedDir = $WorkDir.Replace("'", "''")
    $serviceCommand = "Set-Location '$escapedDir'; npm run dev"

    Write-Host "Starting $Label in a new PowerShell window ..."
    if ($DryRun) {
        return
    }

    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoExit',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        $serviceCommand
    ) -PassThru

    Write-Host "$Label started (PID: $($process.Id)) => $Url"
}

Ensure-PathExists -PathToCheck $backendDir -Label 'Backend directory'
Ensure-PathExists -PathToCheck $frontendDir -Label 'Frontend directory'
Ensure-CommandExists -CommandName 'node'
Ensure-CommandExists -CommandName 'npm'

if ($InstallDeps) {
    if (-not $FrontendOnly) {
        Install-Dependencies -WorkDir $backendDir -Label 'backend'
    }
    if (-not $BackendOnly) {
        Install-Dependencies -WorkDir $frontendDir -Label 'frontend'
    }
}

if (-not $FrontendOnly) {
    Start-DevService -Label 'Backend service' -WorkDir $backendDir -Url 'http://localhost:3000'
}

if (-not $BackendOnly) {
    Start-DevService -Label 'Frontend service' -WorkDir $frontendDir -Url 'http://localhost:5173'
}

Write-Host ''
Write-Host 'Done. Services launched.'
Write-Host 'Backend : http://localhost:3000'
Write-Host 'Frontend: http://localhost:5173'
Write-Host 'Close the spawned service windows to stop the services.'
