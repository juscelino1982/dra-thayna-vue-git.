# Resumo - Sistema de Agendamentos Implementado

## O que foi criado?

Sistema completo de agendamentos com integração automática com Google Calendar e Apple Calendar.

## Arquivos Criados

### Backend
1. **`server/services/google-calendar.ts`** - Integração com Google Calendar API
2. **`server/services/apple-calendar.ts`** - Integração com Apple Calendar (CalDAV + iCalendar)
3. **`server/routes/appointments.ts`** - API REST completa de agendamentos

### Frontend
4. **`src/components/AppointmentCalendar.vue`** - Componente de calendário com timeline
5. **`src/views/AppointmentsPage.vue`** - Página principal de agendamentos

### Banco de Dados
6. **`prisma/schema.prisma`** - Adicionado modelo `Appointment`

### Documentação
7. **`AGENDAMENTOS.md`** - Documentação completa do sistema
8. **`.env.example`** - Atualizado com variáveis de calendário

## Como usar?

### 1. Sincronizar o banco de dados

```bash
pnpm db:push
```

Isso criará a tabela `appointments` no banco de dados.

### 2. Configurar Google Calendar (Opcional)

Se quiser sincronização automática:

1. Acesse https://console.cloud.google.com
2. Crie um projeto
3. Ative a "Google Calendar API"
4. Crie credenciais OAuth 2.0
5. Adicione ao `.env`:

```env
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/appointments/auth/google/callback
```

6. Acesse http://localhost:3001/api/appointments/auth/google
7. Autorize e copie os tokens
8. Adicione ao `.env`:

```env
GOOGLE_ACCESS_TOKEN=ya29...
GOOGLE_REFRESH_TOKEN=1//...
```

### 3. Iniciar o servidor

```bash
# Terminal 1 - Backend
pnpm dev:server

# Terminal 2 - Frontend
pnpm dev
```

### 4. Acessar o sistema

Frontend: http://localhost:5173/agendamentos

## Funcionalidades Principais

### Criar Agendamento

1. Clique em "Novo Agendamento"
2. Preencha os dados:
   - Paciente
   - Título
   - Data e horário
   - Duração
   - Tipo (Consulta, Exame, etc.)
3. Marque as opções de sincronização:
   - ✅ Sincronizar com Google Calendar
   - ✅ Sincronizar com Apple Calendar
4. Salvar

**O que acontece:**
- Agendamento criado no banco de dados
- Se Google ativado: Evento criado automaticamente no Google Calendar
- Se Apple ativado: Evento enviado via CalDAV
- Paciente pode receber convite por email (se cadastrado)

### Visualizar Agendamentos

- **Por dia:** Ver apenas agendamentos do dia selecionado
- **Por semana:** Ver agendamentos da semana
- **Por mês:** Ver agendamentos do mês inteiro

### Filtrar

- Por status (Agendado, Confirmado, Concluído, etc.)
- Por paciente
- Por período

### Download .ICS

Qualquer agendamento pode ser baixado como arquivo `.ics`:

1. Clique no botão ".ICS" do agendamento
2. Arquivo é baixado
3. Pode ser importado em qualquer calendário:
   - Apple Calendar
   - Google Calendar
   - Outlook
   - Thunderbird
   - Qualquer outro

### Editar/Cancelar

- **Editar:** Clique em "Editar" → Atualiza no banco E nos calendários externos
- **Cancelar:** Clique em "Cancelar" → Remove do banco E dos calendários externos

## Endpoints da API

### Agendamentos
- `GET /api/appointments` - Listar
- `GET /api/appointments/:id` - Buscar por ID
- `POST /api/appointments` - Criar
- `PUT /api/appointments/:id` - Atualizar
- `DELETE /api/appointments/:id` - Deletar
- `GET /api/appointments/:id/ics` - Download .ICS

### Autenticação Google
- `GET /api/appointments/auth/google` - URL de auth
- `GET /api/appointments/auth/google/callback` - Callback OAuth2

### Configuração Apple
- `GET /api/appointments/setup/apple` - Instruções

## Swagger/OpenAPI

Toda a API está documentada no Swagger:

http://localhost:3001/api-docs

## Tipos de Agendamento

- **CONSULTATION** - Consulta
- **EXAM** - Exame
- **FOLLOWUP** - Retorno
- **OTHER** - Outro

## Status

- **SCHEDULED** - Agendado
- **CONFIRMED** - Confirmado
- **COMPLETED** - Concluído
- **CANCELLED** - Cancelado
- **NO_SHOW** - Paciente faltou

## Sincronização

### Status de Sync
- **PENDING** - Aguardando
- **SYNCED** - Sincronizado
- **FAILED** - Falhou

### Rastreamento
Cada agendamento mantém:
- `googleEventId` - ID no Google Calendar
- `appleEventId` - UID no Apple Calendar
- `syncStatus` - Status atual
- `lastSyncAt` - Última sincronização
- `syncError` - Erro (se houver)

## Testes Rápidos

### 1. Criar agendamento sem sync

```bash
curl -X POST http://localhost:3001/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "clxxx",
    "userId": "clyyy",
    "title": "Consulta Teste",
    "startTime": "2025-11-16T10:00:00Z",
    "endTime": "2025-11-16T11:00:00Z"
  }'
```

### 2. Listar agendamentos

```bash
curl http://localhost:3001/api/appointments
```

### 3. Download .ICS

```bash
curl http://localhost:3001/api/appointments/{id}/ics -o agendamento.ics
```

## Dependências Instaladas

- `googleapis` - API do Google Calendar
- `ical.js` - Geração de arquivos iCalendar

## Próximos Passos Sugeridos

1. **Executar migração do banco:**
   ```bash
   pnpm db:push
   ```

2. **Testar criação de agendamento na interface**

3. **Configurar Google Calendar** (se quiser sync automático)

4. **Testar download de arquivo .ICS**

5. **Implementar notificações por email/WhatsApp** (futuro)

## Troubleshooting

### Google Calendar não funciona

**Causa:** Credenciais não configuradas ou tokens expirados

**Solução:**
1. Verifique variáveis no `.env`
2. Reautentique em `/api/appointments/auth/google`
3. Copie novos tokens

### Apple Calendar não funciona

**CalDAV:**
- Verifique URL, username e senha de app
- Teste conexão manualmente

**Arquivo .ICS:**
- Sempre funciona (sem configuração)
- Use como alternativa

### Erro "Paciente não encontrado"

**Causa:** ID do paciente inválido

**Solução:** Use um ID válido de paciente existente no banco

## Documentação Completa

Veja [AGENDAMENTOS.md](AGENDAMENTOS.md) para documentação detalhada.

## Estrutura de Dados

```typescript
interface Appointment {
  id: string
  patientId: string
  userId: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  duration: number // minutos
  type: 'CONSULTATION' | 'EXAM' | 'FOLLOWUP' | 'OTHER'
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  location?: string
  isOnline: boolean
  googleEventId?: string
  appleEventId?: string
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
  lastSyncAt?: Date
  syncError?: string
  createdAt: Date
  updatedAt: Date
}
```

---

**Status:** ✅ Implementação completa
**Data:** 2025-11-16
**Versão:** 1.0.0
