# Guia Rápido - Backend API

## Início Rápido em 5 Minutos

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite `.env` e adicione suas chaves de API (opcional para desenvolvimento inicial):

```env
DATABASE_URL="file:./prisma/dev.db"
ANTHROPIC_API_KEY=sua_chave_aqui
OPENAI_API_KEY=sua_chave_aqui
PORT=3001
```

### 3. Configurar Banco de Dados

```bash
npm run db:generate
npm run db:push
```

### 4. Iniciar o Servidor

```bash
npm run dev:server
```

O servidor iniciará em: http://localhost:3001

### 5. Acessar Documentação Swagger

Abra no navegador:

**http://localhost:3001/api-docs**

Aqui você verá toda a documentação interativa da API e poderá testar todos os endpoints!

## Testando a API

### Via Swagger UI (Recomendado)

1. Acesse http://localhost:3001/api-docs
2. Escolha um endpoint (ex: POST /api/patients)
3. Clique em "Try it out"
4. Preencha os dados de exemplo
5. Clique em "Execute"
6. Veja a resposta da API

### Via cURL

```bash
# Health Check
curl http://localhost:3001/health

# Criar um paciente
curl -X POST http://localhost:3001/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "João Silva",
    "phone": "11999999999",
    "email": "joao@example.com"
  }'

# Listar pacientes
curl http://localhost:3001/api/patients
```

### Via Frontend

Se você tiver o frontend rodando, ele já está configurado para se conectar à API:

```bash
# Em outro terminal
npm run dev
```

Frontend: http://localhost:5173

## Endpoints Principais

### Pacientes
- `POST /api/patients` - Criar paciente
- `GET /api/patients` - Listar todos
- `GET /api/patients/:id` - Buscar por ID
- `PUT /api/patients/:id` - Atualizar

### Consultas
- `POST /api/consultations` - Criar consulta
- `GET /api/consultations` - Listar todas
- `POST /api/consultations/:id/upload-audio` - Upload de áudio

### Exames
- `POST /api/exams/upload` - Upload de exame
- `GET /api/exams/:id` - Buscar exame

### Relatórios
- `POST /api/reports/generate` - Gerar relatório com IA
- `GET /api/reports` - Listar relatórios

## Estrutura de Dados

### Exemplo: Criar Paciente

```json
{
  "fullName": "Maria Santos",
  "phone": "11987654321",
  "email": "maria@example.com",
  "birthDate": "1990-05-15T00:00:00.000Z",
  "cpf": "12345678900",
  "address": "Rua das Flores, 123",
  "city": "São Paulo",
  "state": "SP",
  "bloodType": "O+",
  "allergies": "Nenhuma",
  "consentGiven": true
}
```

### Exemplo: Criar Consulta

```json
{
  "patientId": "clxxxxx",
  "conductedBy": "clxxxxx",
  "chiefComplaint": "Dor de cabeça",
  "symptoms": "Dor intensa há 3 dias",
  "status": "SCHEDULED"
}
```

## Recursos Úteis

- **Swagger UI**: http://localhost:3001/api-docs
- **OpenAPI JSON**: http://localhost:3001/api-docs.json
- **Health Check**: http://localhost:3001/health
- **Prisma Studio**: `npm run db:studio` (interface visual do banco)

## Problemas Comuns

### Porta 3001 já em uso

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Erro de banco de dados

```bash
# Recriar banco
rm prisma/dev.db
npm run db:push
```

### Erro de permissão em uploads

```bash
# Criar diretório de uploads
mkdir uploads
mkdir uploads/consultations
```

## Próximos Passos

1. Explore a documentação Swagger
2. Teste cada endpoint usando o Swagger UI
3. Integre com o frontend Vue.js
4. Configure suas chaves de API para funcionalidades de IA
5. Consulte [README-BACKEND.md](README-BACKEND.md) para documentação completa

## Suporte

- Documentação completa: [README-BACKEND.md](README-BACKEND.md)
- Schema do banco: [prisma/schema.prisma](prisma/schema.prisma)
- Swagger UI: http://localhost:3001/api-docs
