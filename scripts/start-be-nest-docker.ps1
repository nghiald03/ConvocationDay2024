[CmdletBinding()]
param(
    [string]$FrontendOrigin = 'http://localhost:3001',
    [string]$EnvironmentFile,
    [string]$ProjectName = 'convocationday2024-nest',
    [int]$WaitTimeoutSeconds = 240,
    [switch]$NoBuild
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $repositoryRoot 'docker-compose.yml'
if ([string]::IsNullOrWhiteSpace($EnvironmentFile)) {
    $EnvironmentFile = Join-Path ([IO.Path]::GetTempPath()) 'convocationday2024-be-nest.env'
}
$EnvironmentFile = [IO.Path]::GetFullPath($EnvironmentFile)
$services = @('postgres', 'minio', 'minio-init', 'be-nest-migrate', 'be-nest')

function New-RandomBase64UrlSecret {
    param([int]$ByteCount)

    $bytes = [byte[]]::new($ByteCount)
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
    param([int]$ByteCount)

    $bytes = [byte[]]::new($ByteCount)
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    }
    finally {
        $generator.Dispose()
    }
    return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}

function Write-TemporaryEnvironment {
    param([string]$Path)

    $parent = Split-Path -Parent $Path
    if (-not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent | Out-Null
    }

    $postgresPassword = 'Pg1!' + (New-RandomBase64UrlSecret -ByteCount 24)
    $betterAuthSecret = New-RandomBase64UrlSecret -ByteCount 48
    $storageAccessKey = 'dev' + (New-RandomHexSecret -ByteCount 12)
    $storageSecretKey = New-RandomBase64UrlSecret -ByteCount 32
    $databasePassword = 'Sql1!' + (New-RandomBase64UrlSecret -ByteCount 24)
    $testAccountPassword = 'Test1!' + (New-RandomBase64UrlSecret -ByteCount 24)
    $lines = @(
        "POSTGRES_PASSWORD=$postgresPassword",
        "BETTER_AUTH_SECRET=$betterAuthSecret",
        "S3_ACCESS_KEY=$storageAccessKey",
        "S3_SECRET_KEY=$storageSecretKey",
        'S3_PUBLIC_ENDPOINT=http://localhost:9000',
        "APP_ORIGIN=$FrontendOrigin",
        'BE_NEST_NODE_ENV=development',
        'SMTP_HOST=',
        'SMTP_PORT=587',
        'SMTP_USER=',
        'SMTP_PASSWORD=',
        'SMTP_FROM=no-reply@example.com',
        "DB_PASSWORD=$databasePassword",
        "TEST_ACCOUNT_PASSWORD=$testAccountPassword"
    )
    $content = ($lines -join [Environment]::NewLine) + [Environment]::NewLine
    [IO.File]::WriteAllText($Path, $content, [Text.UTF8Encoding]::new($false))
}

if (-not (Test-Path -LiteralPath $EnvironmentFile)) {
    Write-TemporaryEnvironment -Path $EnvironmentFile
    Write-Host "Created temporary Docker environment: $EnvironmentFile" -ForegroundColor Green
}
else {
    Write-Host "Using existing temporary Docker environment: $EnvironmentFile"
}

if (-not (Select-String -LiteralPath $EnvironmentFile -Pattern '^TEST_ACCOUNT_PASSWORD=' -Quiet)) {
    $testAccountPassword = 'Test1!' + (New-RandomBase64UrlSecret -ByteCount 24)
    [IO.File]::AppendAllText(
        $EnvironmentFile,
        "TEST_ACCOUNT_PASSWORD=$testAccountPassword$([Environment]::NewLine)",
        [Text.UTF8Encoding]::new($false)
    )
    Write-Host 'Added a generated test-account password to the temporary Docker environment.' -ForegroundColor Green
}

if (-not (Select-String -LiteralPath $EnvironmentFile -Pattern '^BE_NEST_NODE_ENV=' -Quiet)) {
    [IO.File]::AppendAllText(
        $EnvironmentFile,
        "BE_NEST_NODE_ENV=development$([Environment]::NewLine)",
        [Text.UTF8Encoding]::new($false)
    )
    Write-Host 'Configured development cookies for the local NestJS container.' -ForegroundColor Green
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker CLI was not found. Install or start Docker Desktop and ensure docker is available in PATH.'
}

$composeArguments = @(
    'compose',
    '--project-name', $ProjectName,
    '--env-file', $EnvironmentFile,
    '--file', $composeFile
)

Push-Location $repositoryRoot
try {
    & docker @composeArguments config --quiet
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Compose configuration is invalid.'
    }

    # Keep the frontend, legacy ASP.NET backend, and SQL Server outside this temporary project.
    & docker @composeArguments stop fe be database
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to stop services outside the requested scope.'
    }

    $upArguments = $composeArguments + @('up', '--detach')
    if (-not $NoBuild) {
        $upArguments += '--build'
    }
    $upArguments += $services

    & docker @upArguments
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to start the NestJS-related containers.'
    }

    $healthUrl = 'http://localhost:8081/api/health/ready'
    $deadline = (Get-Date).AddSeconds($WaitTimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
                break
            }
        }
        catch {
            if ((Get-Date) -ge $deadline) {
                & docker @composeArguments ps @services
                & docker @composeArguments logs --tail 100 be-nest
                throw "Backend did not become ready within $WaitTimeoutSeconds seconds."
            }
            Start-Sleep -Seconds 2
        }
    } while ((Get-Date) -lt $deadline)

    & docker @composeArguments ps @services
    Write-Host 'NestJS containers are ready; the frontend was not started.' -ForegroundColor Green
    Write-Host 'Backend: http://localhost:8081/api'
    Write-Host 'MinIO:   http://localhost:9000 (console: http://localhost:9001)'
    Write-Host "Temporary env: $EnvironmentFile"
    Write-Host 'Stop the stack with:'
    Write-Host "docker compose --project-name $ProjectName --env-file `"$EnvironmentFile`" --file `"$composeFile`" down"
}
finally {
    Pop-Location
}
