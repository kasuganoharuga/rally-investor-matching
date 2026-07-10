param(
  [Parameter(Mandatory = $true)]
  [string] $DatabaseUrl,

  [string] $SchemaPath = "data/schemas/vc_matching_schema_aws_with_mvp_compat.sql",

  [string] $SeedPath = "data/seeds/local_investors.sql",

  [switch] $SkipSeed
)

$ErrorActionPreference = "Stop"

function Resolve-RepoPath {
  param([string] $PathValue)

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return $PathValue
  }

  return Join-Path (Get-Location) $PathValue
}

function Invoke-PsqlFile {
  param(
    [string] $Url,
    [string] $FilePath,
    [string] $Label
  )

  Write-Host "Running $Label from $FilePath"
  & psql $Url -v ON_ERROR_STOP=1 -f $FilePath
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql was not found. Install PostgreSQL client tools before running this script."
}

$resolvedSchemaPath = Resolve-RepoPath $SchemaPath
$resolvedSeedPath = Resolve-RepoPath $SeedPath

if (-not (Test-Path -LiteralPath $resolvedSchemaPath)) {
  throw "Schema file not found: $resolvedSchemaPath"
}

if (-not $SkipSeed -and -not (Test-Path -LiteralPath $resolvedSeedPath)) {
  throw "Seed file not found: $resolvedSeedPath"
}

Invoke-PsqlFile -Url $DatabaseUrl -FilePath $resolvedSchemaPath -Label "formal schema + MVP compatibility schema"

if (-not $SkipSeed) {
  $separator = "?"
  if ($DatabaseUrl.Contains("?")) {
    $separator = "&"
  }

  $seedUrl = "$DatabaseUrl${separator}options=-csearch_path%3Dmvp_compat%2Cpublic"
  Invoke-PsqlFile -Url $seedUrl -FilePath $resolvedSeedPath -Label "MVP seed data"
}

Write-Host "RDS initialization complete."
Write-Host "Use this search path for the current MVP app: mvp_compat, public"
