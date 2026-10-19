# WAVを差し替えた後、このフォルダで実行します。
$voiceMap = [ordered]@{}
Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.wav' | ForEach-Object {
    $voiceMap[$_.BaseName] = [Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName))
}
$json = ConvertTo-Json -InputObject $voiceMap -Compress
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'voice-data.js'), ('window.VOICE_DATA = ' + $json + ';'), [Text.UTF8Encoding]::new($false))
Write-Output 'voice-data.js を更新しました。ブラウザを再読み込みしてください。'
