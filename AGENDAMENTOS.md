# Sistema de Agendamentos com Integração de Calendários

Sistema completo de agendamentos integrado com Google Calendar e Apple Calendar (iCloud).

## Funcionalidades

### Gestão de Agendamentos
- ✅ Criar, editar e cancelar agendamentos
- ✅ Visualizar agenda por dia, semana ou mês
- ✅ Filtrar por paciente, status ou tipo
- ✅ Múltiplos tipos: Consulta, Exame, Retorno, Outro
- ✅ Status: Agendado, Confirmado, Concluído, Cancelado, Faltou
- ✅ Suporte a consultas online e presenciais
- ✅ Notificações e lembretes

### Sincronização com Google Calendar
- ✅ Criação automática de eventos
- ✅ Atualização bidirecional
- ✅ Exclusão sincronizada
- ✅ OAuth2 para autenticação segura
- ✅ Convites automáticos para pacientes

### Sincronização com Apple Calendar
- ✅ Integração via CalDAV (iCloud)
- ✅ Geração de arquivos .ICS para download
- ✅ Compatível com qualquer app de calendário
- ✅ Importação manual ou automática

## Modelo de Dados

```prisma
model Appointment {
  id              String   @id @default(cuid())
  patientId       String
  userId          String

  // Informações básicas
  title           String
  description     String?
  startTime       DateTime
  endTime         DateTime
  duration        Int      // minutos

  // Tipo e Status
  type            String   @default("CONSULTATION")
  status          String   @default("SCHEDULED")

  // Localização
  location        String?
  isOnline        Boolean  @default(false)

  // Integração com calendários
  googleEventId   String?
  appleEventId    String?
  syncStatus      String   @default("PENDING")
  lastSyncAt      DateTime?
  syncError       String?

  // Relacionamentos
  patient         Patient  @relation(...)
  user            User     @relation(...)
}
```

## Endpoints da API

### Agendamentos

#### `GET /api/appointments`
Lista todos os agendamentos com filtros opcionais.

**Query Parameters:**
- `patientId` - Filtrar por paciente
- `status` - Filtrar por status
- `startDate` - Data inicial
- `endDate` - Data final

**Resposta:**
```json
[
  {
    "id": "clxxx",
    "title": "Consulta - João Silva",
    "patientId": "clyyy",
    "startTime": "2025-11-16T10:00:00Z",
    "endTime": "2025-11-16T11:00:00Z",
    "duration": 60,
    "type": "CONSULTATION",
    "status": "SCHEDULED",
    "googleEventId": "abc123",
    "patient": {
      "fullName": "João Silva",
      "email": "joao@example.com"
    }
  }
]
```

#### `POST /api/appointments`
Cria um novo agendamento.

**Request Body:**
```json
{
  "patientId": "clyyy",
  "userId": "clzzz",
  "title": "Consulta - João Silva",
  "description": "Consulta de rotina",
  "startTime": "2025-11-16T10:00:00Z",
  "endTime": "2025-11-16T11:00:00Z",
  "type": "CONSULTATION",
  "location": "Consultório - Sala 2",
  "isOnline": false,
  "syncWithGoogle": true,
  "syncWithApple": true
}
```

#### `PUT /api/appointments/:id`
Atualiza um agendamento existente. Sincroniza automaticamente com calendários externos.

#### `DELETE /api/appointments/:id`
Cancela um agendamento. Remove dos calendários externos automaticamente.

#### `GET /api/appointments/:id/ics`
Gera e baixa arquivo .ICS para importação manual em qualquer aplicativo de calendário.

**Resposta:** Arquivo `agendamento-{id}.ics`

### Autenticação Google

#### `GET /api/appointments/auth/google`
Retorna URL para autenticação OAuth2 do Google.

**Resposta:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### `GET /api/appointments/auth/google/callback`
Callback OAuth2. Processa o código de autorização e retorna tokens.

**Query Parameter:** `code` (fornecido pelo Google)

**Resposta:**
```json
{
  "message": "Tokens obtidos com sucesso!",
  "tokens": {
    "GOOGLE_ACCESS_TOKEN": "ya29...",
    "GOOGLE_REFRESH_TOKEN": "1//..."
  }
}
```

### Configuração Apple

#### `GET /api/appointments/setup/apple`
Retorna instruções detalhadas para configurar Apple Calendar.

## Configuração

### Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# Google Calendar
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/appointments/auth/google/callback
GOOGLE_ACCESS_TOKEN=ya29...
GOOGLE_REFRESH_TOKEN=1//...

# Apple Calendar (CalDAV) - Opcional
APPLE_CALDAV_URL=https://caldav.icloud.com/[apple-id]/calendars/[calendar-id]
APPLE_CALDAV_USERNAME=seu-email@icloud.com
APPLE_CALDAV_PASSWORD=senha-de-app-especifica
```

### Configurar Google Calendar

1. **Acesse Google Cloud Console**
   - URL: https://console.cloud.google.com

2. **Crie um novo projeto**
   - Nome: "Dra. Thayna - Agendamentos"

3. **Ative a Google Calendar API**
   - APIs & Services → Library
   - Procure por "Google Calendar API"
   - Clique em "Enable"

4. **Crie credenciais OAuth 2.0**
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3001/api/appointments/auth/google/callback`

5. **Obtenha os tokens**
   - Acesse: `http://localhost:3001/api/appointments/auth/google`
   - Autorize o aplicativo
   - Copie os tokens gerados
   - Adicione ao `.env`

### Configurar Apple Calendar (CalDAV)

#### Opção 1: CalDAV (Sincronização Automática)

1. **Gere uma senha de app**
   - Acesse: https://appleid.apple.com
   - Segurança → Senhas de app
   - Gere uma nova senha para "Calendário"

2. **Obtenha a URL CalDAV**
   - Para iCloud: `https://caldav.icloud.com/[seu-apple-id]/calendars/`
   - Substitua `[seu-apple-id]` pelo seu Apple ID

3. **Configure as variáveis de ambiente**
   ```env
   APPLE_CALDAV_URL=https://caldav.icloud.com/[apple-id]/calendars/[calendar-id]
   APPLE_CALDAV_USERNAME=seu-email@icloud.com
   APPLE_CALDAV_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

#### Opção 2: Arquivo .ICS (Mais Simples)

Não requer configuração. Os pacientes podem baixar o arquivo .ICS diretamente da interface e importar em qualquer app de calendário.

## Interface do Usuário

### Página de Agendamentos (`/agendamentos`)

Acesse: http://localhost:5173/agendamentos

**Recursos:**
- Timeline visual dos agendamentos
- Filtros por visualização (dia/semana/mês)
- Filtros por status e paciente
- Criação rápida de agendamentos
- Edição inline
- Download de arquivos .ICS
- Estatísticas em tempo real

### Componente: AppointmentCalendar

```vue
<template>
  <AppointmentCalendar />
</template>

<script setup>
import AppointmentCalendar from '@/components/AppointmentCalendar.vue'
</script>
```

## Fluxo de Trabalho

### 1. Criar Agendamento

```typescript
// Frontend
const appointment = {
  patientId: "clyyy",
  userId: "clzzz",
  title: "Consulta - João Silva",
  startTime: "2025-11-16T10:00:00Z",
  endTime: "2025-11-16T11:00:00Z",
  syncWithGoogle: true,
  syncWithApple: true
}

await axios.post('/api/appointments', appointment)
```

**Backend processa:**
1. Cria registro no banco de dados
2. Formata para Google Calendar
3. Cria evento no Google Calendar
4. Formata para iCalendar (Apple)
5. Envia para CalDAV ou gera .ICS
6. Atualiza status de sincronização
7. Envia convite para paciente (se tiver email)

### 2. Atualizar Agendamento

```typescript
await axios.put(`/api/appointments/${id}`, updates)
```

**Backend processa:**
1. Atualiza banco de dados
2. Sincroniza com Google Calendar (se conectado)
3. Sincroniza com Apple Calendar (se conectado)

### 3. Cancelar Agendamento

```typescript
await axios.delete(`/api/appointments/${id}`)
```

**Backend processa:**
1. Remove do banco de dados
2. Remove do Google Calendar
3. Remove do Apple Calendar

### 4. Download .ICS

```typescript
// Download direto
window.open(`/api/appointments/${id}/ics`)
```

Gera arquivo que pode ser:
- Importado no Apple Calendar
- Importado no Google Calendar
- Importado no Outlook
- Importado em qualquer app de calendário

## Tipos de Agendamento

| Tipo | Descrição | Cor |
|------|-----------|-----|
| `CONSULTATION` | Consulta regular | Azul |
| `EXAM` | Exame/Procedimento | Roxo |
| `FOLLOWUP` | Retorno | Verde |
| `OTHER` | Outros | Cinza |

## Status de Agendamento

| Status | Descrição | Cor |
|--------|-----------|-----|
| `SCHEDULED` | Agendado | Azul |
| `CONFIRMED` | Confirmado pelo paciente | Verde |
| `COMPLETED` | Realizado | Cinza |
| `CANCELLED` | Cancelado | Vermelho |
| `NO_SHOW` | Paciente faltou | Laranja |

## Sincronização

### Status de Sincronização

- `PENDING` - Aguardando sincronização
- `SYNCED` - Sincronizado com sucesso
- `FAILED` - Erro na sincronização

### Rastreamento

Cada agendamento mantém:
- `googleEventId` - ID do evento no Google Calendar
- `appleEventId` - UID do evento no Apple Calendar
- `syncStatus` - Status da última sincronização
- `lastSyncAt` - Data/hora da última sincronização
- `syncError` - Mensagem de erro (se houver)

## Notificações e Lembretes

### Google Calendar
Configurado automaticamente:
- Email: 1 dia antes
- Popup: 1 hora antes

### Apple Calendar
Via arquivo .ICS com alarmes:
- 1 dia antes (24h)
- 1 hora antes (60min)

## Troubleshooting

### Google Calendar não sincroniza

1. Verifique se as variáveis de ambiente estão configuradas
2. Verifique se a API está habilitada no Google Cloud
3. Verifique se os tokens não expiraram
4. Reautentique em `/api/appointments/auth/google`

### Apple Calendar não funciona

**CalDAV:**
- Verifique a URL do CalDAV
- Verifique a senha de app
- Teste a conexão manualmente

**Arquivo .ICS:**
- Sempre funciona (sem configuração necessária)
- Download direto do agendamento

### Erro de permissão

Certifique-se que o usuário autorizou os escopos:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

## Roadmap

- [ ] Notificações por email automáticas
- [ ] Notificações por WhatsApp
- [ ] Sincronização com Outlook/Microsoft 365
- [ ] Agendamento recorrente
- [ ] Sala de espera virtual
- [ ] Integração com videochamada (Zoom/Meet)
- [ ] Confirmação automática via SMS/WhatsApp
- [ ] Dashboard de ocupação
- [ ] Relatórios de no-show

## Tecnologias Utilizadas

**Backend:**
- googleapis (Google Calendar API v3)
- ical.js (iCalendar RFC 5545)
- Prisma ORM

**Frontend:**
- Vue 3
- Vuetify 3
- Axios

## Documentação Adicional

- [Google Calendar API](https://developers.google.com/calendar/api/v3/reference)
- [iCalendar RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545)
- [CalDAV RFC 4791](https://datatracker.ietf.org/doc/html/rfc4791)

---

**Versão:** 1.0.0
**Data:** 2025-11-16
**Autor:** Sistema Dra. Thayná Marra
