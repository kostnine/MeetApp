$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $projectRoot ".env"

$securePassword = Read-Host "Paste Supabase database password" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrWhiteSpace($password)) {
  throw "Database password cannot be empty."
}

$content = @"
DATABASE_URL=postgresql://postgres.wyaaujkkqmewfzpqognk:placeholder@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
DATABASE_PASSWORD=$password
ADMIN_TOKEN=kostnine-admin
ADMIN_PASSWORD=kostnine-admin
ADMIN_JWT_SECRET=meetlink-local-jwt-secret-change-before-deploy
ALLOWED_ORIGIN=http://127.0.0.1:5173
PORT=4000
"@

Set-Content -LiteralPath $envPath -Value $content -Encoding utf8

Write-Host ".env updated at $envPath"
Write-Host "Restart backend with: npm run dev"
