<#
.SYNOPSIS
Script para auto-configurar la IP y arrancar el servidor Docker.
Detectará automáticamente la IP de la computadora actual y generará una contraseña
segura para las sesiones si aún no existe.
#>

$envFile = ".env.docker"

Write-Host "=== Configurando Servidor LVE ===" -ForegroundColor Cyan

# 1. Detectar IP Local (solo IPv4 dentro de rangos locales)
Write-Host "Detectando dirección IP de la red corporativa..."
$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object IPAddress -Match "^192\.|^172\.|^10\." | Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Host "No se pudo detectar una IP de red local (LAN). Usando localhost." -ForegroundColor Yellow
    $ip = "localhost"
} else {
    Write-Host "IP detectada: $ip" -ForegroundColor Green
}

# 2. Generar secreto de autenticación si no existe
$secret = ""
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    # Buscar si ya existe un secreto que no sea el de ejemplo
    if ($content -match 'BETTER_AUTH_SECRET=([a-zA-Z0-9_\-\+\/=]{32,})' -and $content -notmatch "changeme-please") {
        $secret = $matches[1]
        Write-Host "Secreto BETTER_AUTH_SECRET válido encontrado."
    }
}

if (-not $secret) {
    Write-Host "Generando un nuevo secreto criptográfico seguro para las sesiones..." -ForegroundColor Yellow
    $bytes = New-Object Byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)
}

# 3. Guardar en .env.docker
$envContent = @"
# Dominio/IP auto-detectado por start-docker.ps1
DOMAIN=$ip

# Secreto de Autenticación (Generado Automáticamente)
BETTER_AUTH_SECRET=$secret
"@

Set-Content -Path $envFile -Value $envContent
Write-Host "Archivo .env.docker configurado con éxito." -ForegroundColor Green
Write-Host "La aplicación estará disponible en: https://$ip" -ForegroundColor Cyan
Write-Host "------------------------------------------------"

# 4. Iniciar Docker Compose
Write-Host "Iniciando contenedores de Docker..." -ForegroundColor Cyan
docker compose --env-file .env.docker up --build -d

Write-Host "------------------------------------------------"
Write-Host "¡Listo! El servidor se está ejecutando en segundo plano." -ForegroundColor Green
Write-Host "Abre tu navegador web e ingresa a: https://$ip"
Write-Host "Recuerda que al ser un certificado interno, tu navegador dirá 'No seguro' la primera vez (debes darle en Opciones Avanzadas -> Continuar)." -ForegroundColor Yellow
