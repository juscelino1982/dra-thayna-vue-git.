# 📥 Baixar Código da Vercel via CLI

## Método 1: Login Interativo

```powershell
cd E:\WINDOWS.X64_193000_client_home\dra-thayna-vue

# 1. Fazer login
vercel login

# 2. Seguir as instruções (abrir link no navegador)

# 3. Depois de logado, baixar configurações
vercel pull

# Isso vai baixar:
# - .vercel/project.json (configurações do projeto)
# - .vercel/.env.local (variáveis de ambiente locais)
```

## Método 2: Usar Token Direto

Se você já tem um token da Vercel:

```powershell
# Usar token diretamente
vercel pull --token=seu_token_aqui

# Ou configurar token
vercel login --token=seu_token_aqui
vercel pull
```

## Método 3: Baixar Arquivos do Deploy

Para baixar os arquivos do deploy mais recente:

```powershell
# 1. Listar projetos
vercel ls

# 2. Ver deployments
vercel inspect [deployment-url]

# 3. Baixar arquivos (se disponível)
# Nota: A Vercel CLI não tem comando direto para baixar arquivos do deploy
# Você precisaria usar a API ou interface web
```

## ⚠️ Importante

O `vercel pull` baixa principalmente:
- ✅ **Variáveis de ambiente** (.env.local)
- ✅ **Configurações do projeto** (.vercel/)
- ❌ **NÃO baixa código fonte** (código vem do Git)

## 🔄 Se Quiser o Código Fonte

O código fonte na Vercel vem do seu repositório Git. Para sincronizar:

```powershell
# Puxar do repositório remoto
git fetch origin
git pull origin main
```

## 📝 Passo a Passo Completo

```powershell
# 1. Ir para o projeto
cd E:\WINDOWS.X64_193000_client_home\dra-thayna-vue

# 2. Fazer login (se necessário)
vercel login

# 3. Baixar configurações da Vercel
vercel pull

# 4. Ver o que foi baixado
ls .vercel/
cat .vercel/.env.local  # Ver variáveis de ambiente
```

## 🎯 O que o vercel pull faz

1. Cria pasta `.vercel/` com configurações
2. Baixa variáveis de ambiente para `.vercel/.env.local`
3. Sincroniza configurações do projeto

## 💡 Dica

Se você fez mudanças no código via editor da Vercel, elas podem não estar no Git. Nesse caso:
1. Acesse o dashboard da Vercel
2. Vá em Deployments → Selecione o deploy
3. Veja os arquivos modificados
4. Copie manualmente ou use a API da Vercel

