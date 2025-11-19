# 🔧 Correções Feitas para Deploy na Vercel

## ✅ O que foi corrigido:

### 1. **Schema do Prisma** ([prisma/schema.prisma](prisma/schema.prisma))
- ✅ Alterado de `sqlite` para `postgresql`
- ✅ Configurado `url = env("DATABASE_URL")`
- ⚠️ **IMPORTANTE**: Isso significa que você PRECISA de PostgreSQL em produção!

### 2. **API Vercel** ([api/index.ts](api/index.ts))
- ✅ Melhorado CORS com `origin: true` e `credentials: true`
- ✅ Aumentado limite de payload para 50mb (para uploads)
- ✅ Adicionado endpoint raiz `/api` com lista de endpoints
- ✅ Melhorado health check com informações do ambiente
- ✅ Adicionado error handler global
- ✅ Corrigido warnings do TypeScript

### 3. **Configuração Vercel** ([vercel.json](vercel.json))
- ✅ Adicionado `NODE_VERSION: 20`
- ✅ Mantido rewrites para `/api/*`
- ✅ Mantido routes SPA para frontend

### 4. **Variáveis de Ambiente** ([.env](.env))
- ✅ Documentado diferença entre dev (SQLite) e prod (PostgreSQL)
- ✅ Adicionado instruções para configurar na Vercel

## 🚀 O QUE VOCÊ PRECISA FAZER AGORA:

### **PASSO 1: Configurar PostgreSQL na Vercel**

Acesse: https://vercel.com/dashboard

1. Entre no seu projeto `dra-thayna-vue`
2. Vá em **Storage** (menu lateral)
3. Clique em **Create Database**
4. Escolha **Postgres**
5. Nome: `dra-thayna-db` (ou qualquer nome)
6. Clique **Create**

### **PASSO 2: Copiar Connection String**

Após criar o database:
1. Clique no database criado
2. Vá na aba **Settings** ou **Connection**
3. Copie a variável `POSTGRES_URL` ou `DATABASE_URL`

Será algo como:
```
postgres://default:abc123@ep-cool-name-123.us-east-1.postgres.vercel.com:5432/verceldb
```

### **PASSO 3: Configurar Variáveis de Ambiente**

No projeto Vercel → **Settings** → **Environment Variables**

Adicione estas variáveis:

```env
DATABASE_URL=postgresql://... (a URL que você copiou do passo anterior)
ANTHROPIC_API_KEY=sk-ant-api03-... (copie do arquivo .env local)
OPENAI_API_KEY=sk-proj-... (copie do arquivo .env local)
NODE_ENV=production
JWT_SECRET=production-secret-key-change-this
```

⚠️ **IMPORTANTE**: Marque todas as variáveis para **Production**, **Preview** e **Development**

### **PASSO 4: Fazer Deploy**

#### Opção A: Via Git (RECOMENDADO)
```bash
git add .
git commit -m "fix: configurar PostgreSQL e melhorar API para Vercel"
git push origin main
```

A Vercel vai detectar automaticamente e fazer o deploy!

#### Opção B: Via CLI Vercel
```bash
# Login (se ainda não fez)
vercel login

# Deploy
cd dra-thayna-vue
vercel --prod
```

### **PASSO 5: Verificar Deploy**

Após o deploy, teste:

1. **Frontend**: `https://seu-projeto.vercel.app`
2. **API Health**: `https://seu-projeto.vercel.app/api/health`
3. **API Root**: `https://seu-projeto.vercel.app/api`

Você deve ver:
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T...",
  "environment": "production"
}
```

## 🐛 Se der erro no deploy:

### Erro: "Can't reach database server"
- ✅ Verifique se `DATABASE_URL` está configurada
- ✅ Verifique se a URL do PostgreSQL está correta
- ✅ Verifique se o database está ativo na Vercel

### Erro: "Prisma generate failed"
- ✅ Isso é normal na primeira vez
- ✅ A Vercel vai rodar `prisma generate` automaticamente
- ✅ Aguarde o build completar

### Erro: "Module not found"
- ✅ Verifique se todas as dependências estão em `dependencies` (não `devDependencies`)
- ✅ O projeto já está correto, não precisa mudar nada

### Erro: "Build failed"
- ✅ Veja os logs completos no dashboard da Vercel
- ✅ Acesse: Dashboard → Deployments → Clique no deploy → View Function Logs

## 📊 Verificar Logs na Vercel:

### Via Dashboard:
1. Acesse https://vercel.com/dashboard
2. Clique no projeto
3. Vá em **Deployments**
4. Clique no último deployment
5. Veja **Build Logs** e **Function Logs**

### Via CLI:
```bash
# Ver logs em tempo real
vercel logs

# Ver logs de um deployment específico
vercel logs [deployment-url]
```

## 🔄 Desenvolvimento Local x Produção:

### Local (SQLite - Desenvolvimento):
Se quiser continuar usando SQLite localmente:

1. Edite temporariamente [prisma/schema.prisma](prisma/schema.prisma):
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

2. No [.env](.env):
```env
DATABASE_URL="file:./prisma/dev.db"
```

3. Rode:
```bash
pnpm run db:push
```

⚠️ **ANTES DE COMMITAR**: Volte o schema para PostgreSQL!

### Produção (PostgreSQL - Vercel):
O schema atual já está correto para produção.

## ✅ Checklist Final:

- [ ] PostgreSQL criado na Vercel
- [ ] `DATABASE_URL` configurada nas variáveis de ambiente
- [ ] `ANTHROPIC_API_KEY` configurada
- [ ] `OPENAI_API_KEY` configurada
- [ ] Commit e push feitos
- [ ] Deploy executado
- [ ] `/api/health` retorna status OK
- [ ] Frontend carrega sem erros

## 📚 Documentação Adicional:

- **Guia Completo**: [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md)
- **Guia Rápido**: [DEPLOY-QUICKSTART.md](DEPLOY-QUICKSTART.md)
- **Vercel Storage**: [VERCEL-BLOB-STORAGE.md](VERCEL-BLOB-STORAGE.md)

---

**Última atualização**: 2025-11-19
**Status**: ✅ Projeto configurado e pronto para deploy na Vercel
