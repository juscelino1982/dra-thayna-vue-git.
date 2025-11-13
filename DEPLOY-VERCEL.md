# Deploy na Vercel - Guia Completo

Este guia ensina como fazer deploy do projeto Dra. Thayná Vue na Vercel.

## 🚀 Pré-requisitos

- Conta gratuita na [Vercel](https://vercel.com)
- Projeto commitado no GitHub
- Node.js 18.x instalado localmente

## 📋 Configuração do Projeto

O projeto já está configurado com:
- ✅ `vercel.json` - Configuração de rotas e build
- ✅ `.vercelignore` - Arquivos ignorados no deploy
- ✅ `.nvmrc` - Node 18
- ✅ `package.json` - Script `vercel-build`

## 🔧 Deploy via Interface Web (Recomendado)

### Passo 1: Conectar ao GitHub

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Add New Project"**
3. Importe o repositório `juscelino1982/dra-thayna-vue`

### Passo 2: Configurar Variáveis de Ambiente

Adicione as seguintes variáveis em **Environment Variables**:

```env
DATABASE_URL=file:./prisma/dev.db
ANTHROPIC_API_KEY=sua_chave_anthropic
OPENAI_API_KEY=sua_chave_openai
NODE_VERSION=18
```

⚠️ **IMPORTANTE**: Para produção, substitua SQLite por PostgreSQL (veja seção abaixo)

### Passo 3: Configurar Build

- **Framework Preset**: Vite
- **Build Command**: `npm run vercel-build` (automático)
- **Output Directory**: `dist` (automático)
- **Install Command**: `npm install --legacy-peer-deps`
- **Node Version**: 18.x

### Passo 4: Deploy

1. Clique em **Deploy**
2. Aguarde o build (2-3 minutos)
3. Seu site estará disponível em `https://seu-projeto.vercel.app`

## 🔧 Deploy via CLI (Alternativo)

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
cd dra-thayna-vue
vercel --prod

# Siga as instruções interativas
```

## 🗄️ Migrar de SQLite para PostgreSQL (Produção)

### Por que migrar?

SQLite não é recomendado para produção na Vercel porque:
- Sistema de arquivos efêmero (perde dados a cada deploy)
- Sem suporte a múltiplas conexões simultâneas

### Opção 1: PostgreSQL na Vercel (Grátis)

1. No dashboard do projeto na Vercel
2. Vá em **Storage** → **Create Database**
3. Escolha **Postgres**
4. Copie a `DATABASE_URL` gerada
5. Adicione nas **Environment Variables**

### Opção 2: Supabase (Grátis)

```bash
# 1. Criar projeto em supabase.com
# 2. Copiar Connection String (postgres://...)
# 3. Adicionar como DATABASE_URL na Vercel
```

### Opção 3: Neon (Grátis)

```bash
# 1. Criar projeto em neon.tech
# 2. Copiar Connection String
# 3. Adicionar como DATABASE_URL na Vercel
```

### Atualizar schema Prisma

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"  // Mudou de sqlite
  url      = env("DATABASE_URL")
}
```

### Migrar dados

```bash
# Local
npm run db:push

# Rodar migrations na Vercel (automático no build)
```

## 🌐 URLs Importantes

Após o deploy:

- **Frontend**: `https://seu-projeto.vercel.app`
- **API Swagger**: `https://seu-projeto.vercel.app/api-docs`
- **Health Check**: `https://seu-projeto.vercel.app/api/health`

## 🔧 Configurações Avançadas

### Custom Domain

1. No dashboard → **Settings** → **Domains**
2. Adicione seu domínio
3. Configure DNS conforme instruções

### Variáveis de Ambiente por Branch

```bash
# Production
DATABASE_URL=postgres://prod...

# Preview (opcional)
DATABASE_URL=postgres://staging...
```

### Logs e Monitoramento

- **Logs em tempo real**: Dashboard → Deployments → Logs
- **Analytics**: Dashboard → Analytics
- **Functions**: Vercel detecta automaticamente APIs Express

## 🐛 Troubleshooting

### Erro: "Module not found"

```bash
# Certifique-se de que todas dependências estão em "dependencies"
# Não use "devDependencies" para código de produção
```

### Erro: "Database locked" (SQLite)

```
Solução: Migre para PostgreSQL (veja seção acima)
```

### Build muito lento

```bash
# Verifique o tamanho do node_modules
# Use npm ci em vez de npm install
```

### Uploads não funcionam

```
A Vercel tem filesystem efêmero.
Solução: Use Cloudinary, AWS S3, ou Vercel Blob Storage
```

## 📊 Monitoramento

### Vercel Analytics (Grátis)

```bash
npm install @vercel/analytics
```

```typescript
// src/main.ts
import { inject } from '@vercel/analytics'
inject()
```

### Speed Insights

```bash
npm install @vercel/speed-insights
```

## 🎯 Checklist Final

- [ ] Variáveis de ambiente configuradas
- [ ] PostgreSQL configurado (se aplicável)
- [ ] Build passou sem erros
- [ ] API funcionando (`/api-docs`)
- [ ] Frontend carregando
- [ ] Uploads configurados (se usar storage externo)

## 📞 Suporte

- [Documentação Vercel](https://vercel.com/docs)
- [Vercel Discord](https://vercel.com/discord)
- [GitHub Issues](https://github.com/juscelino1982/dra-thayna-vue/issues)

---

**Pronto!** 🎉 Seu projeto está online na Vercel!
