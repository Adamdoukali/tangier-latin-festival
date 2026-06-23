$ffmpeg = "C:\Users\Claro\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"
$sourceDir = "public\reels"
$tempDir = "public\reels_compressed"
# Ensure temp directory exists
if (-not (Test-Path $tempDir)) { New-Item -ItemType Directory -Path $tempDir | Out-Null }

Get-ChildItem "$sourceDir\*.mov" | ForEach-Object {
    $in = $_.FullName
    $out = Join-Path $tempDir $_.Name
    Write-Host "Compressing $($_.Name) -> $out"
    & $ffmpeg -i $in -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 128k -y $out
}
# Replace originals with compressed versions
Get-ChildItem "$tempDir\*.mov" | ForEach-Object {
    $orig = Join-Path $sourceDir $_.Name
    Remove-Item -Force $orig
    Move-Item -Force $_.FullName $orig
}
# Cleanup temp directory
Remove-Item -Recurse -Force $tempDir
