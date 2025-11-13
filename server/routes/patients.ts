import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

/**
 * @swagger
 * tags:
 *   name: Patients
 *   description: Gerenciamento de pacientes
 */

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Lista todos os pacientes
 *     tags: [Patients]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nome, CPF ou telefone
 *     responses:
 *       200:
 *         description: Lista de pacientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Patient'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { fullName: 'asc' },
      include: {
        _count: {
          select: {
            consultations: true,
            reports: true,
            exams: true,
          },
        },
      },
    })

    res.json(patients)
  } catch (error: any) {
    console.error('Erro ao buscar pacientes:', error)
    res.status(500).json({ error: 'Erro ao buscar pacientes', message: error.message })
  }
})

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     summary: Busca um paciente específico por ID
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do paciente
 *     responses:
 *       200:
 *         description: Dados do paciente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Paciente não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        consultations: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        exams: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!patient) {
      return res.status(404).json({ error: 'Paciente não encontrado' })
    }

    res.json(patient)
  } catch (error: any) {
    console.error('Erro ao buscar paciente:', error)
    res.status(500).json({ error: 'Erro ao buscar paciente', message: error.message })
  }
})

/**
 * @swagger
 * /api/patients:
 *   post:
 *     summary: Cria um novo paciente
 *     tags: [Patients]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PatientInput'
 *     responses:
 *       201:
 *         description: Paciente criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  try {
    const patientData = req.body

    const patient = await prisma.patient.create({
      data: patientData,
    })

    res.status(201).json(patient)
  } catch (error: any) {
    console.error('Erro ao criar paciente:', error)
    res.status(500).json({ error: 'Erro ao criar paciente', message: error.message })
  }
})

/**
 * @swagger
 * /api/patients/{id}:
 *   put:
 *     summary: Atualiza os dados de um paciente
 *     tags: [Patients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PatientInput'
 *     responses:
 *       200:
 *         description: Paciente atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Paciente não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const patientData = req.body

    const patient = await prisma.patient.update({
      where: { id },
      data: patientData,
    })

    res.json(patient)
  } catch (error: any) {
    console.error('Erro ao atualizar paciente:', error)
    res.status(500).json({ error: 'Erro ao atualizar paciente', message: error.message })
  }
})

export default router
