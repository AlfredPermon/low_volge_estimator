# gen-secret.ps1 - Genera un secreto hexadecimal criptograficamente seguro (96 chars)
$b = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($b)
[BitConverter]::ToString($b).Replace('-', '').ToLower()
