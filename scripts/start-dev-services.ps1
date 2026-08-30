[CmdletBinding()]
param(
    [string]$FrontendOrigin = 'http://localhost:3000',
    [int]$WaitTimeoutSeconds = 180,
    [switch]$NoBuild,
    [switch]$FollowLogs
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $repositoryRoot 'docker-compose.yml'
$frontendDirectory = Join-Path $repositoryRoot 'fe'
$rootEnvironmentFile = Join-Path $repositoryRoot '.env'
$frontendEnvironmentFile = Join-Path $frontendDirectory '.env.local'
$services = @('database', 'minio', 'minio-init', 'be')

function New-RandomBase64Secret {
    param([int]$ByteCount = 32)

    $bytes = New-Object byte[] $ByteCount
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function New-RandomHexSecret {
    param([int]$ByteCount = 16)

    $bytes = New-Object byte[] $ByteCount
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }
    return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}

function Write-Utf8EnvironmentFile {
    param(
        [string]$Path,
        [string[]]$Lines
    )

    $content = ($Lines -join [Environment]::NewLine) + [Environment]::NewLine
    [IO.File]::WriteAllText($Path, $content, [Text.UTF8Encoding]::new($false))
}

if (-not (Test-Path -LiteralPath $rootEnvironmentFile)) {
    $databasePassword = 'Dev1!' + (New-RandomBase64Secret -ByteCount 24)
    $storageAccessKey = 'dev' + (New-RandomHexSecret -ByteCount 12)
    $storageSecretKey = New-RandomBase64Secret -ByteCount 32

    Write-Utf8EnvironmentFile -Path $rootEnvironmentFile -Lines @(
        "DB_PASSWORD=$databasePassword",
        "S3_ACCESS_KEY=$storageAccessKey",
        "S3_SECRET_KEY=$storageSecretKey",
        'S3_PUBLIC_ENDPOINT=http://localhost:9000',
        "APP_ORIGIN=$FrontendOrigin",
        'ELEVENLABS_API_KEY=',
        'ELEVENLABS_VOICE_ID='
    )
    Write-Host "Created local Docker environment: $rootEnvironmentFile" -ForegroundColor Green
}
else {
    Write-Host "Using existing local Docker environment: $rootEnvironmentFile"
}

if (-not (Test-Path -LiteralPath $frontendEnvironmentFile)) {
    Write-Utf8EnvironmentFile -Path $frontendEnvironmentFile -Lines @(
        'API_URL=http://localhost:88/api',
        'API_ORIGIN=http://localhost:88',
        "NEXT_PUBLIC_APP_ORIGIN=$FrontendOrigin",
        'ELEVENLABS_API_KEY=',
        'ELEVENLABS_VOICE_ID='
    )
    Write-Host "Created local frontend environment: $frontendEnvironmentFile" -ForegroundColor Green
}
else {
    Write-Host "Using existing local frontend environment: $frontendEnvironmentFile"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker CLI was not found. Start Docker Desktop and ensure docker is available in PATH.'
}

$env:APP_ORIGIN = $FrontendOrigin

Push-Location $repositoryRoot
try {
    Write-Host 'Validating Docker Compose configuration...'
    & docker compose --file $composeFile config --quiet
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose validation failed. Check the generated environment file at $rootEnvironmentFile."
    }

    Write-Host 'Stopping the Docker frontend, if it is running...'
    & docker compose --file $composeFile stop fe
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to stop the Docker frontend service.'
    }

    $upArguments = @('compose', '--file', $composeFile, 'up', '--detach')
    if (-not $NoBuild) {
        $upArguments += '--build'
    }
    $upArguments += $services

    Write-Host "Starting Docker development services: $($services -join ', ')..."
    & docker @upArguments
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker development services failed to start.'
    }

    $healthUrl = 'http://localhost:88/health'
    $deadline = (Get-Date).AddSeconds($WaitTimeoutSeconds)
    Write-Host "Waiting for backend health at $healthUrl..."

    do {
        try {
            $healthResponse = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
            if ($healthResponse.StatusCode -ge 200 -and $healthResponse.StatusCode -lt 300) {
                break
            }
        }
        catch {
            if ((Get-Date) -ge $deadline) {
                & docker compose --file $composeFile ps
                & docker compose --file $composeFile logs --tail 100 be
                throw "Backend did not become healthy within $WaitTimeoutSeconds seconds."
            }
            Start-Sleep -Seconds 2
        }
    } while ((Get-Date) -lt $deadline)

    & docker compose --file $composeFile ps database minio minio-init be

    Write-Host ''
    Write-Host 'Docker development services are ready.' -ForegroundColor Green
    Write-Host 'SQL schema:   migrated automatically by the backend'
    Write-Host 'Backend:      http://localhost:88'
    Write-Host 'Backend API:  http://localhost:88/api'
    Write-Host 'MinIO API:    http://localhost:9000'
    Write-Host 'MinIO Console: http://localhost:9001'
    Write-Host "Frontend CORS origin: $FrontendOrigin"
    Write-Host ''
    Write-Host 'Run the frontend locally in another terminal:'
    Write-Host "  Set-Location '$frontendDirectory'"
    Write-Host '  bun run dev'
    Write-Host ''
    Write-Host 'Stop Docker services later with:'
    Write-Host "  docker compose --file '$composeFile' stop database minio be"

    if ($FollowLogs) {
        Write-Host ''
        Write-Host 'Following backend logs. Press Ctrl+C to stop following logs; containers remain running.'
        & docker compose --file $composeFile logs --follow be
    }
}
finally {
    Pop-Location
}
