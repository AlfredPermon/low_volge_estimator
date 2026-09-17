# create_shortcuts.ps1 - Generador de Accesos Directos con Iconos
$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = Get-Location }
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$iconsDir = Join-Path $scriptDir "icons"

$WshShell = New-Object -ComObject WScript.Shell

# 1. Iniciar
$lnkStartPath = Join-Path $desktopPath "Iniciar Low-Voltage Estimator.lnk"
$shortcutStart = $WshShell.CreateShortcut($lnkStartPath)
$shortcutStart.TargetPath = "wscript.exe"
$shortcutStart.Arguments = "`"$scriptDir\Iniciar_Silencioso.vbs`""
$shortcutStart.WorkingDirectory = $scriptDir
if (Test-Path "$iconsDir\start.ico") { $shortcutStart.IconLocation = "$iconsDir\start.ico, 0" }
$shortcutStart.Description = "Iniciar Low-Voltage Estimator en segundo plano"
$shortcutStart.Save()

# 2. Detener
$lnkStopPath = Join-Path $desktopPath "Detener Low-Voltage Estimator.lnk"
$shortcutStop = $WshShell.CreateShortcut($lnkStopPath)
$shortcutStop.TargetPath = "$scriptDir\stop.bat"
$shortcutStop.WorkingDirectory = $scriptDir
if (Test-Path "$iconsDir\stop.ico") { $shortcutStop.IconLocation = "$iconsDir\stop.ico, 0" }
$shortcutStop.Description = "Detener servidor Low-Voltage Estimator"
$shortcutStop.Save()

# 3. Abrir
$lnkOpenPath = Join-Path $desktopPath "Abrir Low-Voltage Estimator.lnk"
$shortcutOpen = $WshShell.CreateShortcut($lnkOpenPath)
$shortcutOpen.TargetPath = "$scriptDir\Abrir_Navegador.bat"
$shortcutOpen.WorkingDirectory = $scriptDir
if (Test-Path "$iconsDir\app.ico") { $shortcutOpen.IconLocation = "$iconsDir\app.ico, 0" }
$shortcutOpen.Description = "Abrir Low-Voltage Estimator en el navegador"
$shortcutOpen.Save()
