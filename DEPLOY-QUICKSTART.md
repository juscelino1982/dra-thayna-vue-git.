# 🚀 Deploy Rápido na Vercel - Passo a Passo

## ⚠️ ATENÇÃO: LEIA TUDO ANTES DE COMEÇAR!

Este projeto está configurado para **PostgreSQL em produção**. SQLite **NÃO funciona** na Vercel porque o filesystem é efêmero.

## 📋 Passo a Passo Completo

### 1️⃣ Criar Database PostgreSQL na Vercel

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Vá no seu projeto → **Storage** tab
3. Clique em **Create Database**
4. Escolha **Postgres**
5. Dê um nome (ex: `dra-thayna-db`)
6. Clique em **Create**
7. **Copie a `POSTGRES_URL`** gerada

### 2️⃣ Configurar Variáveis de Ambiente

No dashboard da Vercel → **Settings** → **Environment Variables**

Adicione:

```env
DATABASE_URL=postgresql://... (cole a URL do passo 1)
ANTHROPIC_API_KEY=sua_chave_anthropic
OPENAI_API_KEY=sua_chave_openai
NODE_ENV=production
```

### 3️⃣ Fazer Deploy

#### Opção A: Via Git Push (Recomendado)
```bash
git add .
git commit -m "chore: configurar PostgreSQL para produção"
git push origin main
```

A Vercel detecta automaticamente e faz deploy!

#### Opção B: Via CLI
```bash
# Login (primeira vez)
vercel login

# Deploy
vercel --prod
```

### 4️⃣ Verificar Deploy

Acesse:
- 🌐 Frontend: `https://seu-projeto.vercel.app`
- 📚 API Docs: `https://seu-projeto.vercel.app/api-docs`
- ❤️ Health: `https://seu-projeto.vercel.app/api/health`

## 🐛 Problemas Comuns

### ❌ Erro: "Can't reach database server"
**Solução**: Verifique se a variável `DATABASE_URL` está configurada corretamente na Vercel.

### ❌ Erro: "Module not found"
**Solução**: Todas as dependências devem estar em `dependencies` (não em `devDependencies`).

### ❌ Erro: "Build failed"
**Solução**: Verifique os logs no dashboard da Vercel → Deployments → View Logs

### ❌ API não funciona
**Solução**: Verifique se a pasta `api/` existe e se [api/index.ts](api/index.ts) está correto.

## 🔄 Desenvolvimento Local com SQLite

Para trabalhar localmente com SQLite (mais rápido para dev):

1. Edite [.env](.env):
```env
DATABASE_URL="file:./prisma/dev.db"
```

2. Mude [prisma/schema.prisma](prisma/schema.prisma) temporariamente:
```prisma
datasource db {
  provider = "sqlite"  // Apenas local!
  url      = env("DATABASE_URL")
}
```

3. Rode:
```bash
pnpm run db:push
pnpm run dev
pnpm run dev:server
```

**⚠️ IMPORTANTE**: Antes de commitar, volte para PostgreSQL no schema!

## 📊 Checklist de Deploy

- [ ] PostgreSQL criado na Vercel
- [ ] `DATABASE_URL` configurada
- [ ] APIs keys configuradas (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`)
- [ ] `schema.prisma` está usando `provider = "postgresql"`
- [ ] Build local passa: `pnpm run build`
- [ ] Commit e push feitos
- [ ] Deploy passou na Vercel
- [ ] Health check funcionando

## 🆘 Precisa de Ajuda?

1. Veja logs detalhados: [Vercel Dashboard](https://vercel.com/dashboard) → Deployments → Logs
2. Veja documentação completa: [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md)
3. Abra um issue: [GitHub Issues](https://github.com/juscelino1982/dra-thayna-vue/issues)

---

**Pronto para produção!** 🎉
