/**
 * Rotas de Agendamentos
 *
 * Endpoints para gerenciar agendamentos e sincronização com calendários
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  formatAppointmentToGoogleEvent,
  listGoogleCalendarEvents,
  getGoogleAuthUrl,
  getGoogleTokensFromCode,
} from '../services/google-calendar.js';
import {
  createCalDAVEvent,
  updateCalDAVEvent,
  deleteCalDAVEvent,
  formatAppointmentToICalEvent,
  createICalendarEvent,
  generateICSFile,
  getAppleCalendarSetupInstructions,
} from '../services/apple-calendar.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Lista todos os agendamentos
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: Filtrar por ID do paciente
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW]
 *         description: Filtrar por status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final
 *     responses:
 *       200:
 *         description: Lista de agendamentos
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { patientId, status, startDate, endDate } = req.query;

    const where: any = {};

    if (patientId) where.patientId = patientId as string;
    if (status) where.status = status as string;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    res.json(appointments);
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     summary: Busca um agendamento por ID
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados do agendamento
 *       404:
 *         description: Agendamento não encontrado
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamento' });
  }
});

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Cria um novo agendamento
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - userId
 *               - title
 *               - startTime
 *               - endTime
 *             properties:
 *               patientId:
 *                 type: string
 *               userId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *                 enum: [CONSULTATION, EXAM, FOLLOWUP, OTHER]
 *               location:
 *                 type: string
 *               isOnline:
 *                 type: boolean
 *               syncWithGoogle:
 *                 type: boolean
 *               syncWithApple:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Agendamento criado com sucesso
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      patientId,
      userId,
      title,
      description,
      startTime,
      endTime,
      type,
      location,
      isOnline,
      notes,
      syncWithGoogle,
      syncWithApple,
    } = req.body;

    // Validações básicas
    if (!patientId || !userId || !title || !startTime || !endTime) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / 60000); // minutos

    // Buscar dados do paciente
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Criar agendamento
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        userId,
        title,
        description,
        startTime: start,
        endTime: end,
        duration,
        type: type || 'CONSULTATION',
        location,
        isOnline: isOnline || false,
        notes,
        status: 'SCHEDULED',
      },
      include: {
        patient: true,
        user: true,
      },
    });

    // Sincronizar com Google Calendar
    let googleEventId = null;
    if (syncWithGoogle) {
      try {
        const googleEvent = formatAppointmentToGoogleEvent({
          title: appointment.title,
          description: appointment.description || undefined,
          location: appointment.location || undefined,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          patient: {
            email: patient.email || undefined,
            fullName: patient.fullName,
          },
        });

        googleEventId = await createGoogleCalendarEvent(googleEvent);

        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            googleEventId,
            syncStatus: 'SYNCED',
            lastSyncAt: new Date(),
          },
        });
      } catch (error) {
        console.error('Erro ao sincronizar com Google Calendar:', error);
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            syncStatus: 'FAILED',
            syncError: String(error),
          },
        });
      }
    }

    // Sincronizar com Apple Calendar
    let appleEventId = null;
    if (syncWithApple) {
      try {
        const icalEvent = formatAppointmentToICalEvent({
          id: appointment.id,
          title: appointment.title,
          description: appointment.description || undefined,
          location: appointment.location || undefined,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          patient: {
            email: patient.email || undefined,
            fullName: patient.fullName,
          },
        });

        const icalData = createICalendarEvent(icalEvent);
        appleEventId = icalEvent.uid;

        await createCalDAVEvent(icalData, appleEventId);

        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            appleEventId,
            syncStatus: 'SYNCED',
            lastSyncAt: new Date(),
          },
        });
      } catch (error) {
        console.error('Erro ao sincronizar com Apple Calendar:', error);
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            syncStatus: 'FAILED',
            syncError: String(error),
          },
        });
      }
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     summary: Atualiza um agendamento
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agendamento atualizado
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Atualizar no banco
    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        user: true,
      },
    });

    // Sincronizar com Google Calendar
    if (updated.googleEventId) {
      try {
        const googleEvent = formatAppointmentToGoogleEvent({
          title: updated.title,
          description: updated.description || undefined,
          location: updated.location || undefined,
          startTime: updated.startTime,
          endTime: updated.endTime,
          patient: {
            email: updated.patient.email || undefined,
            fullName: updated.patient.fullName,
          },
        });

        await updateGoogleCalendarEvent(updated.googleEventId, googleEvent);
      } catch (error) {
        console.error('Erro ao atualizar Google Calendar:', error);
      }
    }

    // Sincronizar com Apple Calendar
    if (updated.appleEventId) {
      try {
        const icalEvent = formatAppointmentToICalEvent({
          id: updated.id,
          title: updated.title,
          description: updated.description || undefined,
          location: updated.location || undefined,
          startTime: updated.startTime,
          endTime: updated.endTime,
          patient: {
            email: updated.patient.email || undefined,
            fullName: updated.patient.fullName,
          },
        });

        const icalData = createICalendarEvent(icalEvent);
        await updateCalDAVEvent(icalData, updated.appleEventId);
      } catch (error) {
        console.error('Erro ao atualizar Apple Calendar:', error);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     summary: Deleta um agendamento
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agendamento deletado
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Deletar do Google Calendar
    if (appointment.googleEventId) {
      try {
        await deleteGoogleCalendarEvent(appointment.googleEventId);
      } catch (error) {
        console.error('Erro ao deletar do Google Calendar:', error);
      }
    }

    // Deletar do Apple Calendar
    if (appointment.appleEventId) {
      try {
        await deleteCalDAVEvent(appointment.appleEventId);
      } catch (error) {
        console.error('Erro ao deletar do Apple Calendar:', error);
      }
    }

    // Deletar do banco
    await prisma.appointment.delete({
      where: { id },
    });

    res.json({ message: 'Agendamento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({ error: 'Erro ao deletar agendamento' });
  }
});

/**
 * @swagger
 * /api/appointments/{id}/ics:
 *   get:
 *     summary: Gera arquivo .ics para download
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Arquivo .ics
 *         content:
 *           text/calendar:
 *             schema:
 *               type: string
 */
router.get('/:id/ics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const icalEvent = formatAppointmentToICalEvent({
      id: appointment.id,
      title: appointment.title,
      description: appointment.description || undefined,
      location: appointment.location || undefined,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      patient: {
        email: appointment.patient.email || undefined,
        fullName: appointment.patient.fullName,
      },
    });

    const icsContent = generateICSFile(icalEvent);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="agendamento-${appointment.id}.ics"`
    );
    res.send(icsContent);
  } catch (error) {
    console.error('Erro ao gerar arquivo .ics:', error);
    res.status(500).json({ error: 'Erro ao gerar arquivo .ics' });
  }
});

/**
 * @swagger
 * /api/appointments/auth/google:
 *   get:
 *     summary: Obtém URL de autenticação do Google
 *     tags: [Appointments]
 *     responses:
 *       200:
 *         description: URL de autenticação
 */
router.get('/auth/google', (req: Request, res: Response) => {
  try {
    const authUrl = getGoogleAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Erro ao gerar URL de autenticação:', error);
    res.status(500).json({ error: 'Erro ao gerar URL de autenticação' });
  }
});

/**
 * @swagger
 * /api/appointments/auth/google/callback:
 *   get:
 *     summary: Callback OAuth2 do Google
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tokens recebidos
 */
router.get('/auth/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Código de autorização não fornecido' });
    }

    const tokens = await getGoogleTokensFromCode(code as string);

    // Aqui você deve salvar os tokens no banco de dados associados ao usuário
    // Por enquanto, retornamos para configuração manual

    res.json({
      message: 'Tokens obtidos com sucesso! Configure as variáveis de ambiente:',
      tokens: {
        GOOGLE_ACCESS_TOKEN: tokens.access_token,
        GOOGLE_REFRESH_TOKEN: tokens.refresh_token,
      },
    });
  } catch (error) {
    console.error('Erro no callback OAuth2:', error);
    res.status(500).json({ error: 'Erro no callback OAuth2' });
  }
});

/**
 * @swagger
 * /api/appointments/setup/apple:
 *   get:
 *     summary: Instruções para configurar Apple Calendar
 *     tags: [Appointments]
 *     responses:
 *       200:
 *         description: Instruções de configuração
 */
router.get('/setup/apple', (req: Request, res: Response) => {
  const instructions = getAppleCalendarSetupInstructions();
  res.send(`<pre>${instructions}</pre>`);
});

export default router;
