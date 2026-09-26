# Publica a Agenda na Vercel.
#
# Por que existe: o deploy por Git esta bloqueado neste projeto. A conta do
# GitHub esta ligada a uma conta Vercel que nao e dona do projeto, e no plano
# Hobby isso barra o build. O CLI tambem le o .git
# da pasta e anexa o autor do commit, caindo na mesma checagem — inclusive
# porque a pasta de usuario inteira e um repositorio git.
#
# A saida e publicar de uma copia fora de qualquer repositorio git. Este script
# faz isso: valida o build aqui, espelha os arquivos para essa copia e publica.
#
# Uso:  .\deploy.ps1

$ErrorActionPreference = 'Stop'

$origem  = $PSScriptRoot
$destino = 'C:\Users\Public\agenda-deploy'

Write-Host ''
Write-Host '[1/3] Validando testes e build aqui, antes de subir...' -ForegroundColor Cyan
Push-Location $origem
try {
    npm test
    if ($LASTEXITCODE -ne 0) { throw 'Os testes falharam. Deploy cancelado.' }

    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'O build falhou. Deploy cancelado.' }
}
finally { Pop-Location }

Write-Host ''
Write-Host '[2/3] Espelhando para a pasta de publicacao...' -ForegroundColor Cyan
if (-not (Test-Path $destino)) { New-Item -ItemType Directory -Path $destino | Out-Null }

# /XD .vercel preserva o vinculo com o projeto, que so existe no destino.
# .git fica de fora de proposito: e ele que dispara a checagem de autor.
robocopy $origem $destino /MIR /XD .git node_modules dist .vercel /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Falha ao copiar os arquivos (robocopy $LASTEXITCODE)." }

if (-not (Test-Path (Join-Path $destino '.vercel\project.json'))) {
    throw "Falta $destino\.vercel\project.json — o vinculo com o projeto da Vercel se perdeu."
}
if (Test-Path (Join-Path $destino '.git')) {
    throw "$destino contem um .git. Remova-o, senao a Vercel volta a bloquear pelo autor do commit."
}

Write-Host ''
Write-Host '[3/3] Publicando em producao...' -ForegroundColor Cyan
Push-Location $destino
try {
    vercel --prod --yes
    if ($LASTEXITCODE -ne 0) { throw 'O deploy falhou. Veja a mensagem acima.' }
}
finally { Pop-Location }

Write-Host ''
Write-Host 'Pronto: publicado em producao.' -ForegroundColor Green
Write-Host 'Se o site continuar mostrando a versao antiga, verifique se ha um' -ForegroundColor Yellow
Write-Host 'Instant Rollback ativo em Deployments — ele prende o dominio numa' -ForegroundColor Yellow
Write-Host 'versao anterior e ignora os deploys novos.' -ForegroundColor Yellow
