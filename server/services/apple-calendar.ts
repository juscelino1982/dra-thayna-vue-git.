/**
 * Serviço de Integração com Apple Calendar (iCloud Calendar)
 *
 * Este serviço gerencia a sincronização de agendamentos com o Apple Calendar
 * usando o protocolo CalDAV e formato iCalendar (RFC 5545).
 */

import ICAL from 'ical.js';

interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  dtstart: Date;
  dtend: Date;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
  }>;
}

/**
 * Cria um evento no formato iCalendar (RFC 5545)
 */
export function createICalendarEvent(eventData: ICalEvent): string {
  const comp = new ICAL.Component(['vcalendar', [], []]);

  // Propriedades do calendário
  comp.updatePropertyWithValue('version', '2.0');
  comp.updatePropertyWithValue('prodid', '-//Dra. Thayna Marra//Appointment System//EN');
  comp.updatePropertyWithValue('calscale', 'GREGORIAN');

  // Criar evento
  const vevent = new ICAL.Component('vevent');
  const event = new ICAL.Event(vevent);

  // UID único para o evento
  event.uid = eventData.uid;

  // Informações básicas
  event.summary = eventData.summary;
  if (eventData.description) {
    event.description = eventData.description;
  }
  if (eventData.location) {
    event.location = eventData.location;
  }

  // Datas e horários
  event.startDate = ICAL.Time.fromJSDate(eventData.dtstart, false);
  event.endDate = ICAL.Time.fromJSDate(eventData.dtend, false);

  // Timestamp de criação
  const now = ICAL.Time.now();
  vevent.updatePropertyWithValue('dtstamp', now);
  vevent.updatePropertyWithValue('created', now);
  vevent.updatePropertyWithValue('last-modified', now);

  // Organizador
  if (eventData.organizer) {
    const organizer = vevent.updatePropertyWithValue(
      'organizer',
      `mailto:${eventData.organizer.email}`
    );
    organizer.setParameter('cn', eventData.organizer.name);
  }

  // Participantes
  if (eventData.attendees && eventData.attendees.length > 0) {
    eventData.attendees.forEach((attendee) => {
      const attendeeProp = new ICAL.Property('attendee');
      attendeeProp.setValue(`mailto:${attendee.email}`);
      attendeeProp.setParameter('cn', attendee.name);
      attendeeProp.setParameter('role', 'REQ-PARTICIPANT');
      attendeeProp.setParameter('partstat', 'NEEDS-ACTION');
      attendeeProp.setParameter('rsvp', 'TRUE');
      vevent.addProperty(attendeeProp);
    });
  }

  // Adicionar evento ao calendário
  comp.addSubcomponent(vevent);

  return comp.toString();
}

/**
 * Envia evento para CalDAV (Apple Calendar / iCloud)
 */
export async function createCalDAVEvent(
  icalData: string,
  eventUid: string
): Promise<void> {
  try {
    const caldavUrl = process.env.APPLE_CALDAV_URL;
    const username = process.env.APPLE_CALDAV_USERNAME;
    const password = process.env.APPLE_CALDAV_PASSWORD;

    if (!caldavUrl || !username || !password) {
      throw new Error('Credenciais CalDAV não configuradas');
    }

    const eventUrl = `${caldavUrl}/${eventUid}.ics`;

    const response = await fetch(eventUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
      },
      body: icalData,
    });

    if (!response.ok) {
      throw new Error(`CalDAV Error: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Evento criado no Apple Calendar (CalDAV):', eventUid);
  } catch (error) {
    console.error('❌ Erro ao criar evento no Apple Calendar:', error);
    throw error;
  }
}

/**
 * Atualiza um evento CalDAV
 */
export async function updateCalDAVEvent(
  icalData: string,
  eventUid: string
): Promise<void> {
  // CalDAV usa PUT para criar e atualizar (idempotente)
  await createCalDAVEvent(icalData, eventUid);
  console.log('✅ Evento atualizado no Apple Calendar (CalDAV):', eventUid);
}

/**
 * Deleta um evento CalDAV
 */
export async function deleteCalDAVEvent(eventUid: string): Promise<void> {
  try {
    const caldavUrl = process.env.APPLE_CALDAV_URL;
    const username = process.env.APPLE_CALDAV_USERNAME;
    const password = process.env.APPLE_CALDAV_PASSWORD;

    if (!caldavUrl || !username || !password) {
      throw new Error('Credenciais CalDAV não configuradas');
    }

    const eventUrl = `${caldavUrl}/${eventUid}.ics`;

    const response = await fetch(eventUrl, {
      method: 'DELETE',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`CalDAV Error: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Evento deletado do Apple Calendar (CalDAV):', eventUid);
  } catch (error) {
    console.error('❌ Erro ao deletar evento do Apple Calendar:', error);
    throw error;
  }
}

/**
 * Formata um agendamento para o formato iCalendar
 */
export function formatAppointmentToICalEvent(
  appointment: {
    id: string;
    title: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime: Date;
    patient: {
      email?: string;
      fullName: string;
    };
  },
  organizerEmail: string = 'contato@drathaynamarra.com.br',
  organizerName: string = 'Dra. Thayná Marra'
): ICalEvent {
  return {
    uid: `appointment-${appointment.id}@drathaynamarra.com.br`,
    summary: appointment.title,
    description: appointment.description,
    location: appointment.location,
    dtstart: appointment.startTime,
    dtend: appointment.endTime,
    organizer: {
      name: organizerName,
      email: organizerEmail,
    },
    attendees: appointment.patient.email
      ? [
          {
            name: appointment.patient.fullName,
            email: appointment.patient.email,
          },
        ]
      : undefined,
  };
}

/**
 * Gera arquivo .ics para download (alternativa ao CalDAV)
 */
export function generateICSFile(eventData: ICalEvent): string {
  return createICalendarEvent(eventData);
}

/**
 * Instrução para obter URL CalDAV do iCloud
 *
 * Para configurar:
 * 1. Acesse icloud.com/calendar
 * 2. Clique no ícone de compartilhamento ao lado do calendário
 * 3. Ative "Calendário Público"
 * 4. Copie o link webcal:// e substitua por https://
 * 5. Adicione /events/ no final
 *
 * Exemplo: https://p##-caldav.icloud.com/published/2/XXXXXXXXXXX
 *
 * Para senha de app:
 * 1. Acesse appleid.apple.com
 * 2. Segurança → Senhas de app
 * 3. Gere uma nova senha específica para calendário
 */
export function getAppleCalendarSetupInstructions(): string {
  return `
# Configuração do Apple Calendar (iCloud)

## Opção 1: CalDAV (Recomendado para sincronização bidirecional)

1. **Obter URL CalDAV:**
   - Acesse: https://appleid.apple.com
   - Vá em "Segurança" → "Senhas de app"
   - Gere uma senha específica para "Calendário"

2. **URL CalDAV do iCloud:**
   https://caldav.icloud.com/[seu-apple-id]/calendars/

3. **Configurar variáveis de ambiente:**
   APPLE_CALDAV_URL=https://caldav.icloud.com/[apple-id]/calendars/[calendar-id]
   APPLE_CALDAV_USERNAME=[seu-email-icloud]
   APPLE_CALDAV_PASSWORD=[senha-de-app-gerada]

## Opção 2: Arquivo .ICS (Simples, mas não sincroniza automaticamente)

O sistema pode gerar arquivos .ics que podem ser importados manualmente
ou enviados por email para os pacientes adicionarem aos seus calendários.
  `;
}
