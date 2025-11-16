import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Estatísticas do dashboard
 */

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Retorna estatísticas do dashboard
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Estatísticas do sistema
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPatients:
 *                   type: number
 *                   description: Total de pacientes cadastrados
 *                 consultationsThisMonth:
 *                   type: number
 *                   description: Consultas realizadas no mês atual
 *                 reportsGenerated:
 *                   type: number
 *                   description: Total de relatórios gerados
 *                 examsAnalyzed:
 *                   type: number
 *                   description: Total de exames analisados
 *       500:
 *         description: Erro ao buscar estatísticas
 */
router.get('/stats', async (req, res) => {
  try {
    // Data do início do mês atual
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Buscar estatísticas em paralelo
    const [totalPatients, consultationsThisMonth, reportsGenerated, examsAnalyzed] = await Promise.all([
      // Total de pacientes cadastrados
      prisma.patient.count(),

      // Consultas este mês
      prisma.consultation.count({
        where: {
          date: {
            gte: startOfMonth,
          },
        },
      }),

      // Relatórios gerados
      prisma.report.count(),

      // Exames analisados (com processamento concluído)
      prisma.exam.count({
        where: {
          processingStatus: 'COMPLETED',
        },
      }),
    ])

    res.json({
      totalPatients,
      consultationsThisMonth,
      reportsGenerated,
      examsAnalyzed,
    })
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error)
    res.status(500).json({
      error: 'Erro ao buscar estatísticas',
      message: error.message,
    })
  }
})

export default router
