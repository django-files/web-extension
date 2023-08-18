$ErrorActionPreference = "Stop"

$excludeList = @(
".*", "manifest-*", "package*", "node_modules",
"LICENSE", "README.md", "build.ps1"
)

$build_dir = Join-Path -Path $(Get-Location) -ChildPath "build"
$manifest = Join-Path -Path $(Get-Location) -ChildPath "manifest.json"
$firefox = Join-Path -Path $(Get-Location) -ChildPath "manifest-firefox.json"
$chrome = Join-Path -Path $(Get-Location) -ChildPath "manifest-chrome.json"
$firefox_archive = Join-Path -Path $build_dir -ChildPath "firefox.zip"
$chrome_archive = Join-Path -Path $build_dir -ChildPath "chrome.zip"

if (Test-Path $build_dir) {
    Write-Host "Removing and Recreating Build Directory: $build_dir"
    Remove-Item -Recurse -Force "$build_dir"
    New-Item -ItemType Directory -Path $build_dir | Out-Null
} else {
    Write-Host "Creating Build Directory: $build_dir"
    New-Item -ItemType Directory -Path $build_dir | Out-Null
}


Write-Host "Creating FireFox Addon."
Copy-Item -Force -Path $firefox -Destination $manifest
$package = Get-ChildItem -Path $(Get-Location) -Exclude $excludeList
$compress = @{
    LiteralPath = $package
    CompressionLevel = "Fastest"
    DestinationPath = $firefox_archive
}
Compress-Archive @compress


Write-Host "Creating Chrome Addon."
Copy-Item -Force -Path $chrome -Destination $manifest
$package = Get-ChildItem -Path $(Get-Location) -Exclude $excludeList
$compress = @{
    LiteralPath = $package
    CompressionLevel = "Fastest"
    DestinationPath = $chrome_archive
}
Compress-Archive @compress


Write-Host "Done."
if (Test-Path $manifest) {
    Remove-Item -Force "$manifest"
}
