/**
 * Serviço de Integração com Google Calendar
 *
 * Este serviço gerencia a sincronização de agendamentos com o Google Calendar
 * usando a API do Google Calendar v3.
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const calendar = google.calendar('v3');

interface CalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

/**
 * Configuração do cliente OAuth2 do Google
 */
function getOAuth2Client(): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
  );

  // Token de acesso (deve ser armazenado por usuário no banco de dados)
  const tokens = {
    access_token: process.env.GOOGLE_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  };

  if (tokens.access_token && tokens.refresh_token) {
    oauth2Client.setCredentials(tokens);
  }

  return oauth2Client;
}

/**
 * Cria um evento no Google Calendar
 */
export async function createGoogleCalendarEvent(
  eventData: CalendarEvent,
  calendarId: string = 'primary'
): Promise<string | null> {
  try {
    const auth = getOAuth2Client();

    const response = await calendar.events.insert({
      auth,
      calendarId,
      requestBody: eventData,
    });

    console.log('✅ Evento criado no Google Calendar:', response.data.id);
    return response.data.id || null;
  } catch (error) {
    console.error('❌ Erro ao criar evento no Google Calendar:', error);
    throw error;
  }
}

/**
 * Atualiza um evento no Google Calendar
 */
export async function updateGoogleCalendarEvent(
  eventId: string,
  eventData: CalendarEvent,
  calendarId: string = 'primary'
): Promise<void> {
  try {
    const auth = getOAuth2Client();

    await calendar.events.update({
      auth,
      calendarId,
      eventId,
      requestBody: eventData,
    });

    console.log('✅ Evento atualizado no Google Calendar:', eventId);
  } catch (error) {
    console.error('❌ Erro ao atualizar evento no Google Calendar:', error);
    throw error;
  }
}

/**
 * Deleta um evento do Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  try {
    const auth = getOAuth2Client();

    await calendar.events.delete({
      auth,
      calendarId,
      eventId,
    });

    console.log('✅ Evento deletado do Google Calendar:', eventId);
  } catch (error) {
    console.error('❌ Erro ao deletar evento do Google Calendar:', error);
    throw error;
  }
}

/**
 * Busca eventos do Google Calendar em um período
 */
export async function listGoogleCalendarEvents(
  timeMin: Date,
  timeMax: Date,
  calendarId: string = 'primary'
): Promise<any[]> {
  try {
    const auth = getOAuth2Client();

    const response = await calendar.events.list({
      auth,
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('❌ Erro ao listar eventos do Google Calendar:', error);
    throw error;
  }
}

/**
 * Gera URL de autenticação OAuth2 para o Google
 */
export function getGoogleAuthUrl(): string {
  const oauth2Client = getOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  return url;
}

/**
 * Troca o código de autorização por tokens
 */
export async function getGoogleTokensFromCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}> {
  const oauth2Client = getOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    expiry_date: tokens.expiry_date!,
  };
}

/**
 * Formata um agendamento para o formato do Google Calendar
 */
export function formatAppointmentToGoogleEvent(appointment: {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  patient: {
    email?: string;
    fullName: string;
  };
}): CalendarEvent {
  return {
    summary: appointment.title,
    description: appointment.description,
    location: appointment.location,
    start: {
      dateTime: appointment.startTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: appointment.endTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    attendees: appointment.patient.email
      ? [
          {
            email: appointment.patient.email,
            displayName: appointment.patient.fullName,
          },
        ]
      : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 dia antes
        { method: 'popup', minutes: 60 }, // 1 hora antes
      ],
    },
  };
}
