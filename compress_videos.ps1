$ffmpeg = "C:\Users\Claro\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"
Get-ChildItem "public\reels\*.mov" | ForEach-Object {
    $in = $_.FullName
    $out = $in -replace '\\.mov$','_compressed.mov'
    & $ffmpeg -i $in -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 128k -y $out
    if (Test-Path $out) {
        Remove-Item -Force $in
        Rename-Item -Path $out -NewName $_.Name
    }
}
