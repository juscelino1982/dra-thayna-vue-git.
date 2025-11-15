import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { generatePatientReport } from '../services/report-generation'

const router = Router()
const prisma = new PrismaClient()

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Gerenciamento de relatórios médicos
 */

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Lista todos os relatórios
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Lista de relatórios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Report'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        consultation: {
          select: {
            id: true,
            date: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json(reports)
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao listar relatórios', message: error.message })
  }
})

// GET /api/reports/patient/:patientId - Listar relatórios de um paciente
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params

    const reports = await prisma.report.findMany({
      where: { patientId },
      include: {
        consultation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.json(reports)
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao listar relatórios', message: error.message })
  }
})

// GET /api/reports/:id - Buscar relatório específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        patient: true,
        consultation: true,
      },
    })

    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' })
    }

    res.json(report)
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao buscar relatório', message: error.message })
  }
})

/**
 * @swagger
 * /api/reports/generate:
 *   post:
 *     summary: Gera um novo relatório usando IA (assíncrono)
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - conductedBy
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: ID do paciente
 *               consultationId:
 *                 type: string
 *                 description: ID da consulta (opcional, será criada automaticamente se não informado)
 *               conductedBy:
 *                 type: string
 *                 description: ID do usuário que está gerando o relatório
 *     responses:
 *       202:
 *         description: Relatório sendo gerado em background
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: string
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
router.post('/generate', async (req, res) => {
  try {
    const { patientId, consultationId, conductedBy } = req.body

    if (!patientId || !conductedBy) {
      return res.status(400).json({
        error: 'PatientId e conductedBy são obrigatórios',
      })
    }

    // Iniciar geração em background
    res.status(202).json({
      message: 'Relatório sendo gerado. Aguarde...',
      status: 'PROCESSING',
    })

    // Processar em background
    processReportGeneration(patientId, consultationId, conductedBy)
      .then((report) => {
        console.log(`[Relatório] Gerado com sucesso: ${report.id}`)
      })
      .catch((error) => {
        console.error('[Relatório] Erro na geração:', error)
      })
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao gerar relatório', message: error.message })
  }
})

// POST /api/reports/generate/sync - Gerar relatório de forma síncrona (para testes)
router.post('/generate/sync', async (req, res) => {
  try {
    const { patientId, consultationId, conductedBy } = req.body

    if (!patientId || !conductedBy) {
      return res.status(400).json({
        error: 'PatientId e conductedBy são obrigatórios',
      })
    }

    const report = await processReportGeneration(patientId, consultationId, conductedBy)

    res.status(201).json(report)
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao gerar relatório', message: error.message })
  }
})

// PUT /api/reports/:id - Atualizar relatório
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      redBloodCells,
      whiteBloodCells,
      platelets,
      plasma,
      supplementation,
      phytotherapy,
      nutritionalGuidance,
      status,
    } = req.body

    const report = await prisma.report.update({
      where: { id },
      data: {
        redBloodCells,
        whiteBloodCells,
        platelets,
        plasma,
        supplementation,
        phytotherapy,
        nutritionalGuidance,
        status,
        reviewedAt: status === 'APPROVED' ? new Date() : undefined,
      },
      include: {
        patient: true,
        consultation: true,
      },
    })

    res.json(report)
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar relatório', message: error.message })
  }
})

// DELETE /api/reports/:id - Deletar relatório
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await prisma.report.delete({
      where: { id },
    })

    res.json({ success: true, message: 'Relatório deletado com sucesso' })
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao deletar relatório', message: error.message })
  }
})

/**
 * Processa a geração do relatório em background
 */
async function processReportGeneration(
  patientId: string,
  consultationId: string | undefined,
  conductedBy: string
) {
  try {
    console.log(`[Relatório] Gerando para paciente ${patientId}...`)

    // Verificar se já existe uma consulta, senão criar uma
    let consultation
    if (consultationId) {
      consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
      })
    } else {
      // Criar uma consulta automática para o relatório
      consultation = await prisma.consultation.create({
        data: {
          patientId,
          conductedBy,
          status: 'COMPLETED',
          chiefComplaint: 'Análise de sangue vivo e avaliação geral',
        },
      })
    }

    if (!consultation) {
      throw new Error('Consulta não encontrada')
    }

    // Gerar relatório com IA
    const generatedReport = await generatePatientReport(patientId, consultation.id)

    // Salvar no banco de dados
    const report = await prisma.report.create({
      data: {
        consultationId: consultation.id,
        patientId,
        generatedBy: conductedBy,
        fullReportContent: generatedReport.fullReportContent,
        mainFindings: JSON.stringify(generatedReport.mainFindings),
        aiGenerated: true,
        aiModel: 'claude-sonnet-4-20250514',
        status: 'PENDING_REVIEW',
      },
      include: {
        patient: true,
        consultation: true,
      },
    })

    console.log(`[Relatório] Salvo no banco: ${report.id}`)

    return report
  } catch (error: any) {
    console.error('[Relatório] Erro:', error)
    throw error
  }
}

export default router
