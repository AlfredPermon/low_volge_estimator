# quick-zip.ps1 - Crea el ZIP de distribucion compatible con el Explorador de Windows
$ErrorActionPreference = "Stop"
$src = "c:\low_voltage_estimator\dist-package"
$out = "c:\low_voltage_estimator\LowVoltageEstimator-v3.0.0-dist.zip"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $out) { Remove-Item $out -Force }
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
try {
    $base = (Resolve-Path $src).Path.TrimEnd('\')
    Get-ChildItem $src -Recurse -File -Force | ForEach-Object {
        $name = $_.FullName.Substring($base.Length + 1).Replace('\', '/')
        $entry = $zip.CreateEntry($name, [System.IO.Compression.CompressionLevel]::Optimal)
        $es = $entry.Open()
        try {
            $fs = New-Object System.IO.FileStream($_.FullName, 'Open', 'Read', 'ReadWrite,Delete')
            try { $fs.CopyTo($es) } finally { $fs.Dispose() }
        } finally { $es.Dispose() }
    }
} finally { $zip.Dispose() }
# Validacion
$z = [System.IO.Compression.ZipFile]::OpenRead($out)
"Entradas: $($z.Entries.Count)"; $z.Dispose()
"Tamano: {0:N1} MB" -f ((Get-Item $out).Length / 1MB)
