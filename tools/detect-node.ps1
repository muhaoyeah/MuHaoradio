$ErrorActionPreference = "Continue"
$env:HTTP_PROXY = "http://127.0.0.1:7897"
$env:HTTPS_PROXY = "http://127.0.0.1:7897"
$env:ALL_PROXY = "http://127.0.0.1:7897"
Write-Host "=== cwd ==="
Get-Location | Out-String | Write-Host
Write-Host "=== git branch ==="
git branch --show-current
Write-Host "=== where node ==="
where.exe node 2>&1 | Out-String | Write-Host
Write-Host "=== where npm ==="
where.exe npm 2>&1 | Out-String | Write-Host
Write-Host "=== NVM_HOME / NVM_SYMLINK ==="
Write-Host "NVM_HOME=$env:NVM_HOME"
Write-Host "NVM_SYMLINK=$env:NVM_SYMLINK"
Write-Host "=== nvm list ==="
if (Get-Command nvm -ErrorAction SilentlyContinue) {
  nvm list 2>&1 | Out-String | Write-Host
} elseif (Test-Path "$env:APPDATA\nvm\nvm.exe") {
  & "$env:APPDATA\nvm\nvm.exe" list 2>&1 | Out-String | Write-Host
} elseif (Test-Path "C:\Program Files\nvm\nvm.exe") {
  & "C:\Program Files\nvm\nvm.exe" list 2>&1 | Out-String | Write-Host
} else {
  Write-Host "nvm not found"
}
Write-Host "=== fnm ==="
if (Get-Command fnm -ErrorAction SilentlyContinue) {
  fnm list 2>&1 | Out-String | Write-Host
} else {
  Write-Host "fnm not found"
}
Write-Host "=== versions ==="
$nv = & node -v 2>&1 | Out-String
$np = & npm -v 2>&1 | Out-String
Write-Host ("node: " + $nv.Trim())
Write-Host ("npm: " + $np.Trim())
Write-Host "=== node_modules present ==="
Test-Path "node_modules"
Write-Host "=== DONE DETECT ==="
