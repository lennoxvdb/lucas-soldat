# Fabrique l'appli Android (APK signé) sur ce PC.
# Usage : powershell -File tools/build_apk.ps1
# La clé de signature et son mot de passe sont HORS du projet : %USERPROFILE%\lucas-soldat-signature
$ErrorActionPreference = 'Continue'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$env:JAVA_HOME = "$env:USERPROFILE\.jdks\jdk-21.0.12.1+1"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$sig = "$env:USERPROFILE\lucas-soldat-signature"
$pw = Get-Content "$sig\mot-de-passe.txt" -Raw
$env:KEYSTORE_FILE = "$sig\lucas-soldat.jks"
$env:KEYSTORE_PASSWORD = $pw
$env:KEY_PASSWORD = $pw
$env:KEY_ALIAS = 'lucassoldat'
# même numéro que GitHub Pages : 1.0.<nombre d'envois> (à lancer après le commit)
$n = (git rev-list --count HEAD).Trim()
$version = "1.0.$n"
$env:VERSION_NAME = $version
$env:VERSION_CODE = $n
node tools/build_www.mjs $version
npx cap sync android
Set-Location android
.\gradlew.bat assembleRelease -q
if ($LASTEXITCODE -ne 0) { Set-Location $root; 'ÉCHEC de la fabrication'; exit 1 }
Set-Location $root
New-Item -ItemType Directory -Force publication | Out-Null
Copy-Item android\app\build\outputs\apk\release\app-release.apk publication\lucas-soldat.apk -Force
"APK prêt : publication\lucas-soldat.apk"
