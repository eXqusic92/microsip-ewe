param(
    [string]$Phone = "380671112233",
    [int]$Duration = 25,
    [string]$MicroSipHost = "127.0.0.1",
    [int]$MicroSipPort = 5060
)

$ErrorActionPreference = "Stop"

$pjsua = "C:\Users\pavlo\microsip-ewe\pjproject-2.15.1\pjsip-apps\bin\pjsua-i386-Win32-vc14-Release.exe"
$target = "sip:test@${MicroSipHost}:$MicroSipPort"
$from = "sip:$Phone@127.0.0.1"

if (!(Test-Path -LiteralPath $pjsua)) {
    throw "pjsua.exe was not found: $pjsua"
}

Write-Host "Calling MicroSIP at $target"
Write-Host "Caller phone: $Phone"

$quitDelay = $Duration + 2

$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $pjsua
$startInfo.Arguments = @(
    "--null-audio"
    "--local-port=5070"
    "--id=$from"
    "--duration=$Duration"
    "--app-log-level=3"
    $target
) -join " "
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.RedirectStandardInput = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $startInfo

try {
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()

    Start-Sleep -Seconds $quitDelay
    if (!$process.HasExited) {
        $process.StandardInput.WriteLine("q")
        $process.StandardInput.Flush()
    }

    if (!$process.WaitForExit(5000)) {
        $process.Kill()
        throw "pjsua did not stop after the test call"
    }

    Write-Host $stdout.Result
    Write-Host $stderr.Result

    if ($process.ExitCode -ne 0) {
        exit $process.ExitCode
    }
}
finally {
    if ($process -and !$process.HasExited) {
        $process.Kill()
    }
    if ($process) {
        $process.Dispose()
    }
}
