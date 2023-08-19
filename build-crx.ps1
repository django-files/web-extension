$ErrorActionPreference = "Stop"

$pem = "C:\Users\Shane\Documents\web-extensions\chrome-extension.pem"
$zip = "C:\Users\Shane\IdeaProjects\chrome-extension\web-ext-artifacts\chrome.zip"
$chrome = "C:\Program Files (x86)\Google\Chrome Dev\Application\chrome.exe"

$build_dir = $(Split-Path -Path $zip -Parent)
$chrome_dir = Join-Path -Path $build_dir -ChildPath "chrome"

if (!(Test-Path $zip)) {
    Write-Output "Unable to locate file: $zip"
    exit 1
}

$manifest = Join-Path -Path $(Get-Location) -ChildPath "manifest-chrome.json"
if (!(Test-Path $manifest)) {
    Write-Output "Unable to locate manifest: $manifest"
    exit 1
}
$manifest_data = Get-Content -Raw $manifest | ConvertFrom-Json
$name = $($manifest_data.name -replace '\s','-').ToLower() + ".crx"

Write-Output "Extracting zip: $zip"
Expand-Archive -Path $zip -DestinationPath $chrome_dir
Write-Output "Packing Extension..."
Start-Process -Wait -NoNewWindow -FilePath $chrome -ArgumentList "--pack-extension=$chrome_dir", "--pack-extension-key=$pem"

Write-Output "Moving .crx to final path: $final_crx"
$crx = Join-Path -Path $build_dir -ChildPath "chrome.crx"
$final_crx = Join-Path -Path $build_dir -ChildPath $name
Move-Item -Force -Path $crx -Destination $final_crx

Write-Output "Removing Unpacked Chrome Directory: $chrome_dir"
Remove-Item -Recurse -Force "$chrome_dir"

Write-Output "Done."
