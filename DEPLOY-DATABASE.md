# 🗄️ Deploy do Banco de Dados - PostgreSQL na Vercel

## 1️⃣ Criar Banco PostgreSQL na Vercel

### Opção A: Vercel Postgres (Recomendado - Grátis)

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto `dra-thayna-vue`
3. Vá em **Storage** → **Create Database**
4. Escolha **Postgres**
5. Nomeie: `dra-thayna-db`
6. **Create**

A Vercel vai criar automaticamente as seguintes variáveis de ambiente:
```
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
```

### Opção B: Neon (Alternativa Gratuita)

1. Acesse [neon.tech](https://neon.tech)
2. Crie uma conta
3. **New Project** → `dra-thayna-db`
4. Copie a **Connection String**:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

## 2️⃣ Configurar Variáveis de Ambiente na Vercel

Vá em **Settings** → **Environment Variables** e adicione:

### Banco de Dados:
```
DATABASE_URL = [sua connection string]
```

### APIs de IA:
```
ANTHROPIC_API_KEY = sk-ant-api03-xxx...xxx (copie do seu .env local)

OPENAI_API_KEY = sk-proj-xxx...xxx (copie do seu .env local)
```

### Outras (opcionais):
```
NODE_ENV = production
PORT = 3001
```

## 3️⃣ Executar Migrations

Após o deploy com sucesso, execute as migrations:

### Localmente (para testar):
```bash
# Configurar DATABASE_URL local para PostgreSQL
export DATABASE_URL="sua_connection_string_aqui"

# Gerar client e migrations
pnpm prisma generate
pnpm prisma db push
```

### Na Vercel (automático):
O script `vercel-build` já executa `prisma generate`, então o cliente Prisma será gerado automaticamente no deploy.

Para aplicar o schema ao banco:
```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Executar comando remoto
vercel env pull
pnpm prisma db push
```

## 4️⃣ Estrutura de API Serverless

O backend agora usa **Vercel Serverless Functions**:

```
/api/index.ts        → Handler principal (Express app)
/server/routes/*     → Rotas do Express
```

### Endpoints disponíveis:
- `GET  /api/health` - Health check
- `GET  /api/patients` - Listar pacientes
- `POST /api/patients` - Criar paciente
- `GET  /api/consultations` - Listar consultas
- `POST /api/reports/generate` - Gerar relatório
- etc.

## 5️⃣ Testar API

Após deploy bem-sucedido:

```bash
# Health check
curl https://seu-projeto.vercel.app/api/health

# Listar pacientes
curl https://seu-projeto.vercel.app/api/patients
```

## 6️⃣ Populando Dados Iniciais

Execute seed script (se tiver):

```bash
# Local
pnpm prisma db seed

# Ou crie dados via API
curl -X POST https://seu-projeto.vercel.app/api/patients \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Teste", "phone": "11999999999"}'
```

## ⚠️ Observações Importantes

1. **SQLite → PostgreSQL**: Algumas queries podem precisar de ajustes
2. **Uploads**: Arquivos não podem ser salvos no filesystem da Vercel
   - Use **Vercel Blob Storage** ou **Cloudinary** para uploads
3. **Cold Starts**: Primeira request pode ser lenta (warm-up)
4. **Limites Free Tier**:
   - Vercel Postgres: 256 MB storage, 60h compute
   - Neon: 512 MB storage, unlimited compute

## 🎯 Checklist Final

- [ ] PostgreSQL criado (Vercel ou Neon)
- [ ] `DATABASE_URL` configurada nas env vars
- [ ] `ANTHROPIC_API_KEY` configurada
- [ ] `OPENAI_API_KEY` configurada
- [ ] Deploy executado com sucesso
- [ ] `prisma generate` rodou no build
- [ ] `prisma db push` aplicou schema
- [ ] `/api/health` retorna status ok
- [ ] `/api/patients` retorna dados (ou array vazio)

---

**Pronto!** Backend rodando com PostgreSQL na Vercel! 🚀
