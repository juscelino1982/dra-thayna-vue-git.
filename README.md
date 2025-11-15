# Sistema Dra. Thayná Marra

Sistema de gestão de consultório médico especializado em Análise do Sangue Vivo (Live Blood Analysis), com integração de Inteligência Artificial para análise de exames e geração de relatórios.

## Índice

- [Visão Geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Instalação Local](#instalação-local)
- [Configuração](#configuração)
- [Execução](#execução)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Deploy](#deploy)
- [Documentação Adicional](#documentação-adicional)
- [Licença](#licença)

## Visão Geral

O Sistema Dra. Thayná Marra é uma plataforma completa de gestão de consultório médico que combina tecnologias web modernas com IA de ponta para fornecer:

- Gestão completa de pacientes com conformidade LGPD
- Rastreamento de consultas com transcrição de áudio
- Análise automatizada de exames usando Claude AI Vision
- Geração de relatórios médicos com IA
- Suporte a chatbot multiplataforma

### Diferenciais

- **IA Integrada**: Utiliza Claude Sonnet 4.5 para análise de exames e geração de relatórios
- **Transcrição Automática**: OpenAI Whisper converte áudio de consultas em texto
- **LGPD Compliant**: Rastreamento de consentimento e trilha de auditoria
- **Duplo Ambiente**: Desenvolvimento local com SQLite, produção com PostgreSQL
- **Documentação Interativa**: Swagger UI para explorar e testar API

## Tecnologias

### Frontend
- **Vue 3.5.24** - Framework JavaScript progressivo
- **TypeScript** - Tipagem estática
- **Vuetify 3.7.6** - Componentes Material Design
- **Vite 7.2.2** - Build tool ultrarrápido
- **Pinia 2.2.8** - Gerenciamento de estado
- **Vue Router 4.5.0** - Roteamento SPA
- **Axios 1.7.9** - Cliente HTTP

### Backend
- **Node.js 20+** - Runtime JavaScript
- **Express 4.21.2** - Framework web
- **Prisma 5.22.0** - ORM moderno
- **PostgreSQL** - Banco de dados (produção)
- **SQLite** - Banco de dados (desenvolvimento)
- **tsx 4.19.2** - Execução TypeScript

### Integrações IA
- **Anthropic Claude** - Modelo `claude-sonnet-4-5-20250929`
- **OpenAI Whisper** - Modelo `whisper-1`

## Requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** 20.x ou superior
- **pnpm** 9.0.0 ou superior (obrigatório)
- **Git** (para clonar o repositório)
- **PostgreSQL** (apenas para produção)

### Instalação do pnpm

```bash
npm install -g pnpm
```

### Verificar versões

```bash
node --version  # deve ser >= 20.x
pnpm --version  # deve ser >= 9.0.0
```

## Instalação Local

### 1. Clonar o repositório

```bash
git clone <url-do-repositorio>
cd dra-thayna-vue
```

### 2. Instalar dependências

```bash
pnpm install
```

O projeto usa `preinstall` hook para garantir que apenas pnpm seja usado.

### 3. Configurar banco de dados local

```bash
# Gerar o Prisma Client
pnpm db:generate

# Sincronizar schema com o banco de dados
pnpm db:push
```

Isso criará um arquivo `prisma/dev.db` (SQLite) para desenvolvimento local.

## Configuração

### Variáveis de Ambiente

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

2. Edite o arquivo `.env` e configure as seguintes variáveis:

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# Server
PORT=3001
NODE_ENV=development

# AI Services (obrigatório para funcionalidades de IA)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Upload
MAX_FILE_SIZE=52428800  # 50MB
UPLOADS_DIR=./uploads
```

### Obter API Keys

**Anthropic Claude:**
1. Acesse [console.anthropic.com](https://console.anthropic.com/)
2. Crie uma conta ou faça login
3. Navegue até "API Keys"
4. Crie uma nova chave e copie para `.env`

**OpenAI:**
1. Acesse [platform.openai.com](https://platform.openai.com/)
2. Crie uma conta ou faça login
3. Navegue até "API Keys"
4. Crie uma nova chave e copie para `.env`

## Execução

### Modo Desenvolvimento

O projeto requer dois servidores rodando simultaneamente:

**Terminal 1 - Frontend (Vite):**
```bash
pnpm dev
```
Acesse: http://localhost:5173

**Terminal 2 - Backend (Express):**
```bash
pnpm dev:server
```
API disponível em: http://localhost:3001

### Acessar Documentação da API

Com o backend rodando, acesse:
- **Swagger UI**: http://localhost:3001/api-docs
- **OpenAPI JSON**: http://localhost:3001/api-docs.json

### Prisma Studio

Para visualizar e editar dados do banco:

```bash
pnpm db:studio
```

Acesse: http://localhost:5555

## Estrutura do Projeto

```
dra-thayna-vue/
├── api/                          # Vercel Serverless Functions
│   └── index.ts                  # Wrapper Express para Vercel
├── server/                       # Backend Express
│   ├── config/
│   │   └── swagger.ts           # Configuração Swagger/OpenAPI
│   ├── routes/
│   │   ├── patients.ts          # CRUD de pacientes
│   │   ├── consultations.ts     # Gestão de consultas
│   │   ├── exams.ts            # Upload e análise de exames
│   │   └── reports.ts          # Geração de relatórios
│   ├── services/
│   │   ├── audio-transcription.ts    # Integração Whisper
│   │   ├── exam-analysis.ts          # Análise de exames com Claude
│   │   └── report-generation.ts      # Geração de relatórios com IA
│   └── index.ts                 # Servidor Express principal
├── src/                         # Frontend Vue 3
│   ├── components/              # Componentes reutilizáveis
│   ├── views/                   # Páginas da aplicação
│   ├── stores/                  # Gerenciamento de estado (Pinia)
│   ├── plugins/                 # Plugins Vue (Vuetify)
│   ├── router/                  # Configuração de rotas
│   ├── App.vue                  # Componente raiz
│   └── main.ts                  # Ponto de entrada
├── prisma/
│   ├── schema.prisma           # Schema do banco de dados
│   ├── seed.ts                 # Script de seed
│   └── dev.db                  # SQLite (desenvolvimento)
├── uploads/                    # Armazenamento de arquivos
├── public/                     # Assets estáticos
├── Documentation/              # Documentação adicional
│   ├── QUICK-START.md
│   ├── README-BACKEND.md
│   ├── DEPLOY-VERCEL.md
│   └── DEPLOY-DATABASE.md
└── Configuration files
    ├── package.json
    ├── vite.config.ts
    ├── vercel.json
    └── tsconfig.json
```

## Funcionalidades

### 1. Gestão de Pacientes
- CRUD completo de pacientes
- Campos: dados pessoais, histórico médico, alergias, medicações
- Conformidade LGPD: rastreamento de consentimento
- Busca e filtros

### 2. Sistema de Consultas
- Upload de áudio de consultas
- Transcrição automática via Whisper AI
- Status: agendada, em andamento, concluída, cancelada
- Registro de queixa principal e sintomas

### 3. Análise de Exames (IA)
- Upload de PDFs e imagens (até 50MB)
- 12 categorias automáticas:
  1. Hemograma
  2. Lipidograma
  3. Glicemia
  4. Hormônios
  5. Tireoide
  6. Função Hepática
  7. Função Renal
  8. Vitaminas
  9. Urina
  10. Fezes
  11. Imagem
  12. Outros

- Processamento IA: Claude extrai dados e categoriza
- Detecção de valores anormais
- Reprocessamento sob demanda

### 4. Geração de Relatórios
- Relatórios médicos gerados por IA
- Seções:
  - Análise microscópica (campo claro/escuro)
  - Principais achados e correlação clínica
  - Orientação terapêutica (suplementos, fitoterapia, nutrição)
  - Recomendações de acompanhamento
- Workflow: Rascunho → Revisão → Aprovado → Enviado
- Exportação em PDF

### 5. Chatbot
- Multiplataforma: WhatsApp, web, Instagram
- Rastreamento de conversas
- Suporte a botões, imagens e rich content

## Deploy

### Vercel (Recomendado)

#### Pré-requisitos de Deploy

1. **Banco de Dados PostgreSQL**
   - Recomendado: Vercel Postgres, Supabase ou Neon
   - SQLite NÃO funciona no Vercel (filesystem efêmero)

2. **Armazenamento de Arquivos**
   - Vercel tem filesystem efêmero
   - Recomendado: Vercel Blob Storage ou Cloudinary
   - Considere migrar de `./uploads` para solução em nuvem

#### Deploy via CLI

```bash
# Instalar Vercel CLI (já instalado neste projeto)
pnpm install -g vercel

# Fazer login
vercel login

# Deploy
vercel
```

#### Configurar Variáveis de Ambiente

No painel da Vercel ou via CLI:

```bash
vercel env add DATABASE_URL
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
vercel env add NODE_ENV
```

Exemplo de `DATABASE_URL` para PostgreSQL:
```
postgresql://user:password@host:5432/database?schema=public
```

#### Executar Migrations

Após configurar o banco PostgreSQL:

```bash
# Localmente, apontando para banco de produção
DATABASE_URL="postgresql://..." pnpm prisma migrate deploy

# Ou via Vercel CLI
vercel env pull .env.production
pnpm prisma migrate deploy
```

### Documentação Completa

Para guias detalhados de deploy, consulte:

- [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md) - Deploy passo a passo na Vercel
- [DEPLOY-DATABASE.md](DEPLOY-DATABASE.md) - Configuração de banco de dados
- [README-BACKEND.md](README-BACKEND.md) - Documentação completa da API

## Documentação Adicional

- [QUICK-START.md](QUICK-START.md) - Setup rápido em 5 minutos
- [README-BACKEND.md](README-BACKEND.md) - API e backend detalhados
- [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md) - Guia de deploy na Vercel
- [DEPLOY-DATABASE.md](DEPLOY-DATABASE.md) - Setup de banco de dados
- [MIGRACAO_COMPLETA.md](MIGRACAO_COMPLETA.md) - Histórico de migração React → Vue

## Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia Vite dev server (porta 3000)
pnpm dev:server       # Inicia Express server (porta 3001)

# Build
pnpm build            # Build de produção (inclui prisma generate)
pnpm preview          # Preview do build de produção

# Database
pnpm db:generate      # Gera Prisma Client
pnpm db:push          # Sincroniza schema com banco
pnpm db:studio        # Abre Prisma Studio

# Vercel
pnpm vercel-build     # Build para Vercel (usado automaticamente)
```

## Troubleshooting

### Erro: "Prisma Client não foi gerado"

```bash
pnpm db:generate
```

### Erro: "Porta 3001 já em uso"

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Erro: "pnpm não encontrado"

```bash
npm install -g pnpm
```

### Banco de dados não sincronizado

```bash
pnpm db:push
```

## Modelo de Dados

O schema do Prisma inclui 11 modelos principais:

- `User` - Usuários do sistema
- `Patient` - Pacientes
- `Consultation` - Consultas
- `ConsultationAudio` - Áudios de consultas
- `Report` - Relatórios médicos
- `Exam` - Exames laboratoriais
- `ChatConversation` - Conversas de chatbot
- `ChatMessage` - Mensagens de chat
- `ReportTemplate` - Templates de relatório
- `SystemConfig` - Configurações do sistema
- `AuditLog` - Log de auditoria (LGPD)
- `ApiUsage` - Rastreamento de uso de APIs

Veja [prisma/schema.prisma](prisma/schema.prisma) para detalhes completos.

## Segurança

### Dados Sensíveis
- Nunca commite `.env` no repositório
- Use `.env.example` como template
- Configure variáveis de ambiente no painel da Vercel

### LGPD
- Sistema rastreia consentimento de pacientes
- Trilha de auditoria completa em `AuditLog`
- Suporte a direito de exclusão

### Upload de Arquivos
- Limite de 50MB por padrão
- Validação de tipo de arquivo
- Considere sanitização adicional em produção

## Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Suporte

Para dúvidas ou problemas:

1. Consulte a [documentação adicional](#documentação-adicional)
2. Verifique issues existentes no repositório
3. Abra uma nova issue descrevendo o problema

## Roadmap

- [ ] Implementação de autenticação JWT
- [ ] Dashboard com métricas e gráficos
- [ ] Agendamento de consultas
- [ ] Notificações por e-mail/SMS
- [ ] App mobile (React Native ou Capacitor)
- [ ] Migração de uploads para Vercel Blob Storage
- [ ] Backup automático de banco de dados
- [ ] Tema escuro (dark mode)

## Licença

Este projeto é propriedade privada. Todos os direitos reservados.

## Autores

Sistema desenvolvido para Dra. Thayná Marra - Especialista em Análise do Sangue Vivo.

---

**Versão:** 1.0.0
**Última atualização:** 2025-01-14
