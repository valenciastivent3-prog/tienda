<#
  LIMPIEZA SEGURA DE RESPALDOS EN js\
  - NUNCA borra nada: MUEVE los archivos viejos a  respaldos\js_viejos_<fecha>\
  - Por defecto es una SIMULACIÓN (solo muestra qué movería). Para mover de verdad:  .\limpiar_respaldos.ps1 -Aplicar
  - Solo toca archivos de js\ cuyo nombre parece respaldo (.bak, backup, antes, ROTO, con_id, .old, copia)
    y que NO estén cargados por ningún .html. Los archivos activos jamás se mueven.
  Ejecútalo desde la carpeta de la tienda (donde está index.html).
#>
param([switch]$Aplicar)
$ErrorActionPreference = 'Stop'
$raiz = (Get-Location).Path
if (-not (Test-Path (Join-Path $raiz 'index.html')) -or -not (Test-Path (Join-Path $raiz 'js'))) {
  Write-Host 'Ejecuta este script desde la carpeta de la tienda (donde está index.html).' -ForegroundColor Red; exit 1
}
# Scripts que cargan las páginas (no se tocan)
$activos = @{}
Get-ChildItem -Path $raiz -Filter *.html | ForEach-Object {
  [regex]::Matches((Get-Content $_.FullName -Raw), 'src="(js/[^"]+)"') | ForEach-Object { $activos[($_.Groups[1].Value -replace '/', '\').ToLower()] = $true }
}
$patron = '\.bak|backup|antes|roto|con_id|\.old|copia'
$candidatos = Get-ChildItem -Path (Join-Path $raiz 'js') -File | Where-Object {
  $_.Name -match $patron -and -not $activos.ContainsKey(('js\' + $_.Name).ToLower())
}
if (-not $candidatos) { Write-Host 'No hay archivos de respaldo para mover.'; exit 0 }
$destino = Join-Path $raiz ('respaldos\js_viejos_' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
Write-Host ("Archivos que se moverían a {0}:" -f $destino) -ForegroundColor Cyan
$candidatos | ForEach-Object { Write-Host ('  ' + $_.Name + '  (' + [math]::Round($_.Length/1KB,1) + ' KB)') }
if (-not $Aplicar) { Write-Host "`nSIMULACIÓN: no se movió nada. Para mover de verdad: .\limpiar_respaldos.ps1 -Aplicar" -ForegroundColor Yellow; exit 0 }
New-Item -ItemType Directory -Path $destino -Force | Out-Null
$candidatos | ForEach-Object { Move-Item -LiteralPath $_.FullName -Destination (Join-Path $destino $_.Name) }
$candidatos | Select-Object -ExpandProperty Name | Set-Content -Path (Join-Path $destino '_LISTA.txt') -Encoding UTF8
Write-Host ("`nListo: {0} archivos movidos (no borrados). Para deshacer, devuélvelos desde {1}" -f $candidatos.Count, $destino) -ForegroundColor Green
