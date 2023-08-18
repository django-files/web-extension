$ErrorActionPreference = "Stop"

$excludeList = @(
    ".*", "manifest-*", "package*", "build*", "node_modules", "web-ext-artifacts"
)

$build_dir = Join-Path -Path $(Get-Location) -ChildPath "web-ext-artifacts"
$manifest = Join-Path -Path $(Get-Location) -ChildPath "manifest.json"
$firefox = Join-Path -Path $(Get-Location) -ChildPath "manifest-firefox.json"
$chrome = Join-Path -Path $(Get-Location) -ChildPath "manifest-chrome.json"
#$firefox_archive = Join-Path -Path $build_dir -ChildPath "firefox.zip"
$chrome_archive = Join-Path -Path $build_dir -ChildPath "chrome.zip"

if (Test-Path $build_dir) {
    Write-Host "Removing and Recreating Build Directory: $build_dir"
    Remove-Item -Recurse -Force "$build_dir"
    New-Item -ItemType Directory -Path $build_dir | Out-Null
} else {
    Write-Host "Creating Build Directory: $build_dir"
    New-Item -ItemType Directory -Path $build_dir | Out-Null
}


$manifest_data = Get-Content -Raw $chrome | ConvertFrom-Json
Write-Host "Creating Chrome Addon Version: $($manifest_data.version)"
Copy-Item -Force -Path $chrome -Destination $manifest
$package = Get-ChildItem -Path $(Get-Location) -Exclude $excludeList
$compress = @{
    LiteralPath = $package
    CompressionLevel = "NoCompression"
    DestinationPath = $chrome_archive
}
Compress-Archive -Force @compress
#Move-Item -Path "chrome.zip" -Destination $build_dir


$manifest_data = Get-Content -Raw $firefox | ConvertFrom-Json
Write-Host "Creating FireFox Addon Version: $($manifest_data.version)"
Copy-Item -Force -Path $firefox -Destination $manifest
Start-Process -FilePath npx -ArgumentList "web-ext build --overwrite-dest --ignore-files=package* manifest-* build*" -NoNewWindow -Wait
#$package = Get-ChildItem -Path $(Get-Location) -Exclude $excludeList
#$compress = @{
#    LiteralPath = $package
#    CompressionLevel = "NoCompression"
#    DestinationPath = $firefox_archive
#}
#Compress-Archive @compress


if (Test-Path $manifest) {
    Remove-Item -Force "$manifest"
}
Write-Host "Done."
