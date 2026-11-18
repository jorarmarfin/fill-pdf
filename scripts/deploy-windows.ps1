# Deploy manual Windows: compila y genera MSIX en release\windows\
# Requisitos: Rust (MSVC), Node + yarn, WebView2, Windows SDK (makeappx.exe / signtool.exe)
# Uso:
#   .\scripts\deploy-windows.ps1                       # MSIX sin firmar
#   .\scripts\deploy-windows.ps1 -Pfx cert.pfx -PfxPassword x -Publisher "CN=Luis Mayta"
#   .\scripts\deploy-windows.ps1 -SelfSigned           # crea cert de prueba y firma
param(
  [string]$Publisher = "CN=FillPdfDev",
  [string]$PublisherDisplay = "Luis Mayta",
  [string]$IdentityName = "jorarmarfin.FillPdf",
  [string]$Pfx,
  [string]$PfxPassword,
  [switch]$SelfSigned
)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$conf = Get-Content src-tauri\tauri.conf.json -Raw | ConvertFrom-Json
$ver = "$($conf.version).0"   # MSIX exige 4 componentes

function Find-SdkTool($name) {
  $c = Get-Command $name -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $f = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\$name" -ErrorAction SilentlyContinue |
       Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $f) { throw "No se encontró $name. Instala Windows SDK." }
  $f.FullName
}
$makeappx = Find-SdkTool "makeappx.exe"

if (-not (Test-Path node_modules)) { yarn install --immutable }
yarn tauri build --no-bundle
if ($LASTEXITCODE -ne 0) { throw "Falló tauri build" }

$stage = "release\windows\stage"
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item "$stage\Assets" -ItemType Directory -Force | Out-Null
Copy-Item src-tauri\target\release\fill-pdf.exe $stage
foreach ($a in "Square150x150Logo","Square44x44Logo","StoreLogo") {
  Copy-Item "src-tauri\icons\$a.png" "$stage\Assets\"
}

if ($SelfSigned -and -not $Pfx) {
  $cert = New-SelfSignedCertificate -Type Custom -Subject $Publisher -KeyUsage DigitalSignature `
    -FriendlyName "FillPdf dev" -CertStoreLocation "Cert:\CurrentUser\My" `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3","2.5.29.19={text}")
  $Pfx = "release\windows\fillpdf-dev.pfx"
  $PfxPassword = "fillpdf"
  Export-PfxCertificate -Cert $cert -FilePath $Pfx -Password (ConvertTo-SecureString $PfxPassword -AsPlainText -Force) | Out-Null
  Export-Certificate -Cert $cert -FilePath "release\windows\fillpdf-dev.cer" | Out-Null
  Write-Host "Cert de prueba: instala release\windows\fillpdf-dev.cer en 'Personas de confianza' (admin) antes de instalar el MSIX."
}

(Get-Content packaging\AppxManifest.xml -Raw).
  Replace("__IDENTITY_NAME__", $IdentityName).Replace("__PUBLISHER__", $Publisher).
  Replace("__PUBLISHER_DISPLAY__", $PublisherDisplay).Replace("__VERSION__", $ver) |
  Set-Content "$stage\AppxManifest.xml" -Encoding utf8

$msix = "release\windows\FillPdf_$ver.msix"
& $makeappx pack /d $stage /p $msix /o
if ($LASTEXITCODE -ne 0) { throw "Falló makeappx" }

if ($Pfx) {
  $signtool = Find-SdkTool "signtool.exe"
  & $signtool sign /fd SHA256 /a /f $Pfx /p $PfxPassword $msix
  if ($LASTEXITCODE -ne 0) { throw "Falló signtool" }
}
Write-Host "Listo: $msix"
