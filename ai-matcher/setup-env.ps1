# 首次配置：复制 .env.example → .env
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$example = Join-Path $here ".env.example"
$envFile = Join-Path $here ".env"

if (Test-Path $envFile) {
  Write-Host "已存在 .env，跳过复制。请直接编辑：$envFile"
  exit 0
}

Copy-Item $example $envFile
Write-Host "已创建 .env，请编辑并填入 NEWAPI_API_KEY："
Write-Host $envFile
