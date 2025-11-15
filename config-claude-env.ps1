# Script para configurar a variável de ambiente do Claude CLI
# Execute este script no PowerShell: .\config-claude-env.ps1

# Verificar se o Git Bash existe
$gitBashPath = "C:\Program Files\Git\bin\bash.exe"
if (Test-Path $gitBashPath) {
    Write-Host "✓ Git Bash encontrado em: $gitBashPath" -ForegroundColor Green
    
    # Configurar para a sessão atual
    $env:CLAUDE_CODE_GIT_BASH_PATH = $gitBashPath
    Write-Host "✓ Variável configurada para esta sessão" -ForegroundColor Green
    
    # Configurar permanentemente para o usuário
    [System.Environment]::SetEnvironmentVariable("CLAUDE_CODE_GIT_BASH_PATH", $gitBashPath, "User")
    Write-Host "✓ Variável configurada permanentemente" -ForegroundColor Green
    
    # Testar o Claude CLI
    Write-Host "`nTestando Claude CLI..." -ForegroundColor Yellow
    claude --version
    
    Write-Host "`n✅ Configuração concluída!" -ForegroundColor Green
    Write-Host "Você pode usar 'claude' agora neste terminal." -ForegroundColor Cyan
} else {
    Write-Host "✗ Git Bash não encontrado em: $gitBashPath" -ForegroundColor Red
    Write-Host "Por favor, instale o Git para Windows: https://git-scm.com/downloads/win" -ForegroundColor Yellow
}

