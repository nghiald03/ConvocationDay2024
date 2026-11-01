[CmdletBinding()]
param(
    [string]$DockerHubUser = 'chalsfptu',
    [string]$Tag,
    [string]$Platform = 'linux/amd64',
    [ValidateSet('be-nest', 'be-nest-migrate', 'fe')]
    [string[]]$Only,
    [switch]$AllowDirty,
    [switch]$NoLatest,
    [switch]$NoPush
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker CLI was not found. Install or start Docker Desktop and ensure docker is available in PATH.'
}

Push-Location $repositoryRoot
try {
    $dirty = git status --porcelain -- be-nest fe
    if ($dirty -and -not $AllowDirty) {
        throw 'be-nest/ or fe/ has uncommitted changes. Commit them first or pass -AllowDirty.'
    }

    $revision = (git rev-parse --short HEAD).Trim()
    if ([string]::IsNullOrWhiteSpace($Tag)) {
        $Tag = if ($dirty) { "$revision-dirty" } else { $revision }
    }

    # Server-side service names are baked into the Next.js rewrites at build time.
    $images = @(
        @{ Name = 'be-nest-migrate'; Context = 'be-nest'; Target = 'migration'; BuildArgs = @() },
        @{ Name = 'be-nest'; Context = 'be-nest'; Target = 'runtime'; BuildArgs = @() },
        @{ Name = 'fe'; Context = 'fe'; Target = $null; BuildArgs = @(
            '--build-arg', 'API_URL=http://be-nest:8081/api',
            '--build-arg', 'API_ORIGIN=http://be-nest:8081'
        ) }
    )
    if ($Only) {
        $images = $images | Where-Object { $Only -contains $_.Name }
    }

    $published = @()
    foreach ($image in $images) {
        $repository = "$DockerHubUser/convocation-$($image.Name)"
        $tags = @("${repository}:$Tag")
        if (-not $NoLatest) {
            $tags += "${repository}:latest"
        }

        $buildArguments = @('build', '--platform', $Platform, '--label', "org.opencontainers.image.revision=$revision")
        if ($image.Target) {
            $buildArguments += @('--target', $image.Target)
        }
        $buildArguments += $image.BuildArgs
        foreach ($imageTag in $tags) {
            $buildArguments += @('--tag', $imageTag)
        }
        $buildArguments += $image.Context

        Write-Host "Building $repository ($Tag, $Platform)" -ForegroundColor Cyan
        & docker @buildArguments
        if ($LASTEXITCODE -ne 0) {
            throw "Unable to build $repository."
        }

        if (-not $NoPush) {
            foreach ($imageTag in $tags) {
                & docker push $imageTag
                if ($LASTEXITCODE -ne 0) {
                    throw "Unable to push $imageTag. Run 'docker login' as $DockerHubUser first."
                }
            }
        }
        $published += $tags
    }

    if ($NoPush) {
        Write-Host 'Images built locally (not pushed):' -ForegroundColor Green
    }
    else {
        Write-Host 'Images pushed to Docker Hub:' -ForegroundColor Green
    }
    $published | ForEach-Object { Write-Host "  $_" }
}
finally {
    Pop-Location
}
