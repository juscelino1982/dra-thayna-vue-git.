import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import formidable from 'formidable'
import fs from 'fs/promises'
import path from 'path'
import { analyzeExam } from '../services/exam-analysis'

const router = Router()
const prisma = new PrismaClient()

/**
 * @swagger
 * tags:
 *   name: Exams
 *   description: Gerenciamento de exames laboratoriais
 */

// Diretório para salvar uploads
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

// Criar diretório de uploads se não existir
async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR)
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true })
  }
}

ensureUploadsDir()

/**
 * @swagger
 * /api/exams/upload:
 *   post:
 *     summary: Faz upload de um exame laboratorial
 *     tags: [Exams]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - file
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: ID do paciente
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo do exame (PDF ou imagem)
 *     responses:
 *       201:
 *         description: Upload realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 exam:
 *                   $ref: '#/components/schemas/Exam'
 *                 message:
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
router.post('/upload', async (req, res) => {
  try {
    const form = formidable({
      uploadDir: UPLOADS_DIR,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
    })

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Erro no parse do formulário:', err)
        return res.status(400).json({ error: 'Erro ao processar upload', message: err.message })
      }

      try {
        const patientId = Array.isArray(fields.patientId) ? fields.patientId[0] : fields.patientId
        const file = Array.isArray(files.file) ? files.file[0] : files.file

        if (!patientId || !file) {
          return res.status(400).json({ error: 'PatientId e file são obrigatórios' })
        }

        // Determinar tipo de arquivo
        const fileType = file.mimetype?.includes('pdf') ? 'pdf' : 'image'
        const fileName = file.originalFilename || 'exame.pdf'

        // Criar registro inicial do exame
        const exam = await prisma.exam.create({
          data: {
            patientId,
            fileName,
            fileUrl: file.filepath,
            fileType,
            fileSize: file.size,
            processingStatus: 'PROCESSING',
          },
        })

        // Processar análise em background (async, não espera)
        processExamAnalysis(exam.id, file.filepath, fileType as 'pdf' | 'image')
          .catch(error => console.error('Erro ao processar análise:', error))

        res.status(201).json({
          success: true,
          exam,
          message: 'Upload realizado com sucesso. Análise em andamento...',
        })
      } catch (error: any) {
        console.error('Erro ao salvar exame:', error)
        res.status(500).json({ error: 'Erro ao salvar exame', message: error.message })
      }
    })
  } catch (error: any) {
    console.error('Erro no upload:', error)
    res.status(500).json({ error: 'Erro no upload', message: error.message })
  }
})

router.post('/:id/reprocess', async (req, res) => {
  try {
    const { id } = req.params

    const exam = await prisma.exam.findUnique({
      where: { id },
    })

    if (!exam) {
      return res.status(404).json({ error: 'Exame não encontrado' })
    }

    if (!exam.fileUrl || !exam.fileType) {
      return res.status(400).json({ error: 'Exame não possui arquivo associado para reprocessamento' })
    }

    await prisma.exam.update({
      where: { id },
      data: {
        processingStatus: 'PROCESSING',
        processingError: null,
        aiSummary: null,
        keyFindings: null,
        abnormalValues: null,
        extractedData: null,
        recommendations: null,
      },
    })

    await processExamAnalysis(id, exam.fileUrl, exam.fileType as 'pdf' | 'image')

    const updatedExam = await prisma.exam.findUnique({
      where: { id },
    })

    res.json({
      success: true,
      message: 'Reprocessamento concluído',
      exam: updatedExam,
    })
  } catch (error: any) {
    console.error('Erro ao reprocessar exame:', error)
    res.status(500).json({ error: 'Erro ao reprocessar exame', message: error.message })
  }
})

// Função para processar análise em background
async function processExamAnalysis(examId: string, filePath: string, fileType: 'pdf' | 'image') {
  try {
    console.log(`[${examId}] Iniciando análise do exame...`)

    // Analisar com IA
    const analysis = await analyzeExam(filePath, fileType)

    // Atualizar exame com resultados
    await prisma.exam.update({
      where: { id: examId },
      data: {
        category: analysis.category,
        subCategory: analysis.subCategory,
        examType: analysis.examType,
        examDate: analysis.examDate ? new Date(analysis.examDate) : null,
        extractedData: JSON.stringify(analysis.extractedData),
        aiSummary: analysis.summary,
        aiModel: 'claude-sonnet-4.5',
        keyFindings: JSON.stringify(analysis.keyFindings),
        abnormalValues: JSON.stringify(analysis.abnormalValues),
        processingStatus: 'COMPLETED',
      },
    })

    console.log(`[${examId}] Análise concluída com sucesso!`)
  } catch (error: any) {
    console.error(`[${examId}] Erro na análise:`, error)

    // Atualizar com erro
    await prisma.exam.update({
      where: { id: examId },
      data: {
        processingStatus: 'FAILED',
        processingError: error.message,
      },
    })
  }
}

/**
 * @swagger
 * /api/exams/{id}:
 *   get:
 *     summary: Busca um exame específico por ID
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do exame
 *     responses:
 *       200:
 *         description: Dados do exame
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       404:
 *         description: Exame não encontrado
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

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    })

    if (!exam) {
      return res.status(404).json({ error: 'Exame não encontrado' })
    }

    res.json(exam)
  } catch (error: any) {
    console.error('Erro ao buscar exame:', error)
    res.status(500).json({ error: 'Erro ao buscar exame', message: error.message })
  }
})

// DELETE /api/exams/:id - Deletar exame
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const exam = await prisma.exam.findUnique({
      where: { id },
    })

    if (!exam) {
      return res.status(404).json({ error: 'Exame não encontrado' })
    }

    // Deletar arquivo físico se existir
    if (exam.fileUrl) {
      try {
        await fs.unlink(exam.fileUrl)
        console.log(`Arquivo deletado: ${exam.fileUrl}`)
      } catch (error: any) {
        console.error('Erro ao deletar arquivo físico:', error)
        // Continua mesmo se não conseguir deletar o arquivo
      }
    }

    // Deletar registro do banco
    await prisma.exam.delete({
      where: { id },
    })

    res.json({ success: true, message: 'Exame deletado com sucesso' })
  } catch (error: any) {
    console.error('Erro ao deletar exame:', error)
    res.status(500).json({ error: 'Erro ao deletar exame', message: error.message })
  }
})

export default router
