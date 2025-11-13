# API Backend - Sistema Dra. Thayná Marra

API RESTful completa para o sistema de análise do sangue vivo, desenvolvida com Express, Prisma e documentada com Swagger/OpenAPI.

## Tecnologias

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **TypeScript** - Superset JavaScript tipado
- **Prisma** - ORM para banco de dados
- **SQLite** - Banco de dados (desenvolvimento)
- **Swagger/OpenAPI** - Documentação de API
- **Anthropic Claude** - IA para análise e geração de relatórios
- **OpenAI Whisper** - Transcrição de áudio

## Instalação

### 1. Clone o repositório e instale as dependências

```bash
npm install
```

### 2. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione suas chaves de API:

```env
DATABASE_URL="file:./prisma/dev.db"
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
```

### 3. Configure o banco de dados

```bash
# Gerar o Prisma Client
npm run db:generate

# Criar/atualizar o banco de dados
npm run db:push
```

### 4. Inicie o servidor

```bash
# Desenvolvimento (com hot reload)
npm run dev:server

# Produção
npm run build
npm start
```

## Documentação da API

Após iniciar o servidor, acesse a documentação interativa do Swagger:

- **Swagger UI**: http://localhost:3001/api-docs
- **OpenAPI JSON**: http://localhost:3001/api-docs.json
- **Health Check**: http://localhost:3001/health

## Endpoints Principais

### Pacientes (Patients)

- `GET /api/patients` - Lista todos os pacientes
- `GET /api/patients/:id` - Busca paciente por ID
- `POST /api/patients` - Cria novo paciente
- `PUT /api/patients/:id` - Atualiza paciente

### Consultas (Consultations)

- `GET /api/consultations` - Lista todas as consultas
- `GET /api/consultations/:id` - Busca consulta por ID
- `GET /api/consultations/patient/:patientId` - Lista consultas de um paciente
- `POST /api/consultations` - Cria nova consulta
- `POST /api/consultations/:id/upload-audio` - Upload de áudio da consulta
- `PUT /api/consultations/:id` - Atualiza consulta
- `DELETE /api/consultations/:id` - Deleta consulta

### Exames (Exams)

- `POST /api/exams/upload` - Upload de exame (PDF ou imagem)
- `GET /api/exams/:id` - Busca exame por ID
- `POST /api/exams/:id/reprocess` - Reprocessa análise do exame
- `DELETE /api/exams/:id` - Deleta exame

### Relatórios (Reports)

- `GET /api/reports` - Lista todos os relatórios
- `GET /api/reports/:id` - Busca relatório por ID
- `GET /api/reports/patient/:patientId` - Lista relatórios de um paciente
- `POST /api/reports/generate` - Gera relatório com IA (assíncrono)
- `POST /api/reports/generate/sync` - Gera relatório com IA (síncrono)
- `PUT /api/reports/:id` - Atualiza relatório
- `DELETE /api/reports/:id` - Deleta relatório

## Estrutura do Projeto

```
dra-thayna-vue/
├── server/
│   ├── config/
│   │   └── swagger.ts          # Configuração Swagger/OpenAPI
│   ├── routes/
│   │   ├── patients.ts         # Rotas de pacientes
│   │   ├── consultations.ts    # Rotas de consultas
│   │   ├── exams.ts            # Rotas de exames
│   │   └── reports.ts          # Rotas de relatórios
│   ├── services/
│   │   ├── audio-transcription.ts  # Serviço de transcrição
│   │   ├── exam-analysis.ts        # Serviço de análise de exames
│   │   └── report-generation.ts    # Serviço de geração de relatórios
│   └── index.ts                # Servidor principal
├── prisma/
│   ├── schema.prisma           # Schema do banco de dados
│   └── dev.db                  # Banco de dados SQLite
├── uploads/                    # Arquivos enviados
├── .env                        # Variáveis de ambiente (não versionado)
├── .env.example                # Exemplo de variáveis
└── package.json                # Dependências e scripts
```

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia frontend (Vite)
npm run dev:server       # Inicia backend (hot reload)

# Build
npm run build            # Build do frontend

# Banco de dados
npm run db:generate      # Gera Prisma Client
npm run db:push          # Atualiza schema do banco
npm run db:studio        # Abre Prisma Studio
```

## Banco de Dados

O projeto utiliza Prisma ORM com SQLite para desenvolvimento. O schema inclui:

- **User** - Usuários do sistema (médicos/staff)
- **Patient** - Pacientes
- **Consultation** - Consultas médicas
- **ConsultationAudio** - Áudios das consultas
- **Report** - Relatórios de análise
- **Exam** - Exames laboratoriais
- **ChatConversation** - Conversas do chatbot
- **ChatMessage** - Mensagens do chat
- **ReportTemplate** - Templates de relatório
- **AuditLog** - Log de auditoria
- **ApiUsage** - Controle de uso de APIs

### Migrações

Para alterar o schema do banco:

1. Edite `prisma/schema.prisma`
2. Execute `npm run db:push` para aplicar as mudanças

## Integrações de IA

### Anthropic Claude

Usado para:
- Geração de relatórios médicos
- Análise de exames laboratoriais
- Sumarização de consultas

### OpenAI Whisper

Usado para:
- Transcrição automática de áudios de consultas

## Upload de Arquivos

O sistema suporta upload de:
- **Áudios de consulta**: até 100MB (formatos de áudio)
- **Exames**: até 50MB (PDF ou imagens)

Os arquivos são salvos em `uploads/` e processados automaticamente.

## Segurança

- Validação de dados de entrada
- Sanitização de uploads
- Logs de auditoria
- Conformidade com LGPD (consentimento de pacientes)

## Desenvolvimento

### Adicionar novo endpoint

1. Crie/edite a rota em `server/routes/`
2. Adicione a documentação Swagger usando JSDoc
3. Teste usando o Swagger UI

Exemplo:

```typescript
/**
 * @swagger
 * /api/resource:
 *   get:
 *     summary: Descrição do endpoint
 *     tags: [Resource]
 *     responses:
 *       200:
 *         description: Sucesso
 */
router.get('/', async (req, res) => {
  // implementação
})
```

## Produção

Para deploy em produção:

1. Configure variáveis de ambiente de produção
2. Altere `DATABASE_URL` para PostgreSQL/MySQL
3. Execute `npm run build`
4. Configure CORS para domínios permitidos
5. Use um gerenciador de processo (PM2, systemd)

## Suporte

Para dúvidas ou problemas:
- Consulte a documentação Swagger
- Verifique os logs do servidor
- Abra uma issue no repositório

## Licença

MIT
