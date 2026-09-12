$ErrorActionPreference = "Continue"
$env:HTTP_PROXY = "http://127.0.0.1:7897"
$env:HTTPS_PROXY = "http://127.0.0.1:7897"
$env:ALL_PROXY = "http://127.0.0.1:7897"

Set-Location $PSScriptRoot\..
Write-Host "=== cwd ==="
Get-Location | Out-String | Write-Host

$nvmCmd = $null
if (Get-Command nvm -ErrorAction SilentlyContinue) { $nvmCmd = "nvm" }
elseif (Test-Path "$env:APPDATA\nvm\nvm.exe") { $nvmCmd = "$env:APPDATA\nvm\nvm.exe" }
elseif (Test-Path "C:\Program Files\nvm\nvm.exe") { $nvmCmd = "C:\Program Files\nvm\nvm.exe" }

if ($nvmCmd) {
  Write-Host "=== nvm list (before) ==="
  & $nvmCmd list 2>&1 | Out-String | Write-Host
  $listOut = & $nvmCmd list 2>&1 | Out-String
  if ($listOut -match "22\.") {
    Write-Host "Switching to runtime 22 via nvm..."
    & $nvmCmd use 22 2>&1 | Out-String | Write-Host
  }
}

$cfg = @"
proxy=http://127.0.0.1:7897
https-proxy=http://127.0.0.1:7897
"@
Set-Content -Path ".npmrc" -Value $cfg -Encoding ASCII
Write-Host "Wrote project local proxy config"

Write-Host "=== versions in use ==="
$nv = & node -v 2>&1 | Out-String
$np = & npm -v 2>&1 | Out-String
Write-Host ("node: " + $nv.Trim())
Write-Host ("npm: " + $np.Trim())
"node=$($nv.Trim())" | Set-Content -Path "tools\build-win-versions.txt" -Encoding UTF8
"npm=$($np.Trim())" | Add-Content -Path "tools\build-win-versions.txt" -Encoding UTF8

Write-Host "=== clean-install (ci) ==="
$ciLog = "tools\deps-ci.log"
& npm ci --no-fund --no-audit 2>&1 | Tee-Object -FilePath $ciLog
$ciExit = $LASTEXITCODE
"ci_exit=$ciExit" | Add-Content -Path "tools\build-win-versions.txt" -Encoding UTF8
Write-Host "ci exit: $ciExit"

if ($ciExit -ne 0) {
  Write-Host "=== ci FAILED; trying install ==="
  $installLog = "tools\deps-install.log"
  & npm install --no-fund --no-audit 2>&1 | Tee-Object -FilePath $installLog
  $installExit = $LASTEXITCODE
  "install_exit=$installExit" | Add-Content -Path "tools\build-win-versions.txt" -Encoding UTF8
  Write-Host "install exit: $installExit"
  if ($installExit -ne 0) {
    Write-Host "DEPENDENCY INSTALL FAILED"
    exit $installExit
  }
} else {
  "install_exit=skipped_ci_ok" | Add-Content -Path "tools\build-win-versions.txt" -Encoding UTF8
}

Write-Host "=== run build:win ==="
$buildLog = "tools\build-win.log"
& npm run build:win 2>&1 | Tee-Object -FilePath $buildLog
$buildExit = $LASTEXITCODE
"build_exit=$buildExit" | Add-Content -Path "tools\build-win-versions.txt" -Encoding UTF8
Write-Host "build:win exit: $buildExit"

Write-Host "=== dist artifacts ==="
if (Test-Path "dist") {
  Get-ChildItem -Path "dist" -Recurse -File | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize | Out-String | Write-Host
  Get-ChildItem -Path "dist" -Recurse -File | ForEach-Object {
    "$($_.FullName)|$($_.Length)"
  } | Set-Content -Path "tools\build-win-artifacts.txt" -Encoding UTF8
} else {
  Write-Host "dist/ missing"
  "NO_DIST" | Set-Content -Path "tools\build-win-artifacts.txt" -Encoding UTF8
}

Write-Host "=== DONE BUILD ==="
exit $buildExit
