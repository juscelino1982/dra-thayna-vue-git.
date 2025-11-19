/**
 * Rotas de API para Agendamentos
 *
 * CRUD completo de agendamentos sem integraçõesexternas
 */

import express, { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { getDefaultUserId } from '../utils/ensure-default-user'

const router = express.Router()

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
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Lista de agendamentos
 */
router.get('/', async (req: Request, res: Response) => {
  const { patientId, userId, status, startDate, endDate } = req.query

  try {
    const where: any = {}

    if (patientId) where.patientId = patientId
    if (userId) where.userId = userId
    if (status) where.status = status

    if (startDate || endDate) {
      where.startTime = {}
      if (startDate) where.startTime.gte = new Date(startDate as string)
      if (endDate) where.startTime.lte = new Date(endDate as string)
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    res.json(appointments)
  } catch (error: any) {
    console.error('Erro ao listar agendamentos:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /api/appointments/:id:
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
 *         description: Agendamento encontrado
 *       404:
 *         description: Agendamento não encontrado
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        user: true
      }
    })

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    res.json(appointment)
  } catch (error: any) {
    console.error('Erro ao buscar agendamento:', error)
    res.status(500).json({ error: error.message })
  }
})

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
 *               location:
 *                 type: string
 *               isOnline:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Agendamento criado
 */
router.post('/', async (req: Request, res: Response) => {
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
    notes
  } = req.body

  if (!patientId || !title || !startTime || !endTime) {
    return res.status(400).json({
      error: 'Campos obrigatórios: patientId, title, startTime, endTime'
    })
  }

  try {
    // Se userId não foi fornecido, usa o usuário padrão
    const finalUserId = userId || await getDefaultUserId()

    // Verifica se o paciente existe
    const patientExists = await prisma.patient.findUnique({
      where: { id: patientId }
    })

    if (!patientExists) {
      return res.status(400).json({
        error: 'Paciente não encontrado',
        patientId
      })
    }

    // Verifica se o usuário existe
    const userExists = await prisma.user.findUnique({
      where: { id: finalUserId }
    })

    if (!userExists) {
      return res.status(400).json({
        error: 'Usuário não encontrado',
        userId: finalUserId
      })
    }

    const start = new Date(startTime)
    const end = new Date(endTime)
    const duration = Math.round((end.getTime() - start.getTime()) / 60000) // minutos

    console.log('Creating appointment with:', {
      patientId,
      userId: finalUserId,
      title,
      startTime: start,
      endTime: end
    })

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        userId: finalUserId,
        title,
        description,
        startTime: start,
        endTime: end,
        duration,
        type: type || 'CONSULTATION',
        location,
        isOnline: isOnline || false,
        notes,
        status: 'SCHEDULED'
      },
      include: {
        patient: true,
        user: true
      }
    })

    res.status(201).json(appointment)
  } catch (error: any) {
    console.error('Erro ao criar agendamento:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /api/appointments/:id:
 *   put:
 *     summary: Atualiza um agendamento
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Agendamento atualizado
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const data = req.body

  try {
    const existing = await prisma.appointment.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    // Recalcula duração se start ou end mudaram
    if (data.startTime || data.endTime) {
      const start = data.startTime ? new Date(data.startTime) : existing.startTime
      const end = data.endTime ? new Date(data.endTime) : existing.endTime
      data.duration = Math.round((end.getTime() - start.getTime()) / 60000)
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data,
      include: {
        patient: true,
        user: true
      }
    })

    res.json(appointment)
  } catch (error: any) {
    console.error('Erro ao atualizar agendamento:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /api/appointments/:id:
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
  const { id } = req.params

  try {
    const appointment = await prisma.appointment.findUnique({ where: { id } })
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    await prisma.appointment.delete({ where: { id } })

    res.json({ success: true, message: 'Agendamento deletado com sucesso' })
  } catch (error: any) {
    console.error('Erro ao deletar agendamento:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /api/appointments/:id/cancel:
 *   post:
 *     summary: Cancela um agendamento
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agendamento cancelado
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  const { id } = req.params
  const { reason } = req.body

  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason
      },
      include: {
        patient: true,
        user: true
      }
    })

    res.json(appointment)
  } catch (error: any) {
    console.error('Erro ao cancelar agendamento:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
