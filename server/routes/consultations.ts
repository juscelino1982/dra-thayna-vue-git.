import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import formidable from 'formidable'
import fs from 'fs/promises'
import path from 'path'
import { transcribeAudio } from '../services/audio-transcription'

const router = Router()
const prisma = new PrismaClient()

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'consultations')

// Criar diretório se não existir
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error)

/**
 * @swagger
 * tags:
 *   name: Consultations
 *   description: Gerenciamento de consultas médicas
 */

/**
 * @swagger
 * /api/consultations:
 *   get:
 *     summary: Lista todas as consultas
 *     tags: [Consultations]
 *     responses:
 *       200:
 *         description: Lista de consultas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Consultation'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const consultations = await prisma.consultation.findMany({
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
        audioRecordings: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    res.json(consultations)
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao listar consultas', message: error.message })
  }
})

// GET /api/consultations/patient/:patientId - Listar consultas de um paciente
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params

    const consultations = await prisma.consultation.findMany({
      where: { patientId },
      include: {
        report: true,
        audioRecordings: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    res.json(consultations)
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao listar consultas', message: error.message })
  }
})

/**
 * @swagger
 * /api/consultations/{id}:
 *   get:
 *     summary: Busca uma consulta específica por ID
 *     tags: [Consultations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da consulta
 *     responses:
 *       200:
 *         description: Dados da consulta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Consultation'
 *       404:
 *         description: Consulta não encontrada
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

    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: true,
        report: true,
        audioRecordings: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!consultation) {
      return res.status(404).json({ error: 'Consulta não encontrada' })
    }

    res.json(consultation)
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao buscar consulta', message: error.message })
  }
})

/**
 * @swagger
 * /api/consultations:
 *   post:
 *     summary: Cria uma nova consulta
 *     tags: [Consultations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsultationInput'
 *     responses:
 *       201:
 *         description: Consulta criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Consultation'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Paciente ou usuário não encontrado
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
    const { patientId, conductedBy, chiefComplaint, symptoms, status } = req.body

    if (!patientId) {
      return res.status(400).json({
        error: 'PatientId é obrigatório',
      })
    }

    const patientExists = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } })

    if (!patientExists) {
      return res.status(404).json({
        error: 'Paciente não encontrado',
      })
    }

    // Verificar usuário responsável
    let conductedById = conductedBy as string | undefined

    if (!conductedById) {
      const defaultUser = await prisma.user.findFirst({ select: { id: true } })

      if (!defaultUser) {
        return res.status(400).json({
          error: 'Nenhum usuário cadastrado para associar à consulta. Cadastre um usuário ou informe conductedBy.',
        })
      }

      conductedById = defaultUser.id
    } else {
      const userExists = await prisma.user.findUnique({ where: { id: conductedById }, select: { id: true } })

      if (!userExists) {
        return res.status(404).json({
          error: 'Usuário responsável não encontrado',
        })
      }
    }

    const consultation = await prisma.consultation.create({
      data: {
        patientId,
        conductedBy: conductedById,
        chiefComplaint,
        symptoms,
        status: status || 'SCHEDULED',
      },
      include: {
        patient: true,
      },
    })

    res.status(201).json(consultation)
  } catch (error: any) {
    console.error('Erro ao criar consulta:', error)
    res.status(500).json({ error: 'Erro ao criar consulta', message: error.message })
  }
})

// POST /api/consultations/:id/upload-audio - Upload de áudio da consulta
router.post('/:id/upload-audio', async (req, res) => {
  try {
    const { id } = req.params

    const consultation = await prisma.consultation.findUnique({
      where: { id },
    })

    if (!consultation) {
      return res.status(404).json({ error: 'Consulta não encontrada' })
    }

    const form = formidable({
      uploadDir: UPLOADS_DIR,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      filter: ({ mimetype }) => {
        // Aceitar apenas arquivos de áudio
        return mimetype?.startsWith('audio/') || false
      },
    })

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(400).json({ error: 'Erro ao processar upload', message: err.message })
      }

      try {
        const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio

        if (!audioFile) {
          return res.status(400).json({ error: 'Arquivo de áudio é obrigatório' })
        }

        const audioRecord = await prisma.consultationAudio.create({
          data: {
            consultationId: id,
            fileUrl: audioFile.filepath,
            fileName: audioFile.originalFilename || path.basename(audioFile.filepath),
            fileSize: typeof audioFile.size === 'number' ? audioFile.size : 0,
            transcriptionStatus: 'PROCESSING',
          },
        })

        // Iniciar transcrição em background
        processAudioTranscription(audioRecord.id, audioFile.filepath).catch((error) =>
          console.error('Erro ao processar transcrição:', error)
        )

        res.status(200).json({
          success: true,
          audio: audioRecord,
          message: 'Upload realizado com sucesso. Transcrição enviada para a OpenAI.',
        })
      } catch (error: any) {
        res.status(500).json({ error: 'Erro ao salvar áudio', message: error.message })
      }
    })
  } catch (error: any) {
    res.status(500).json({ error: 'Erro no upload', message: error.message })
  }
})

// PUT /api/consultations/:id - Atualizar consulta
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      chiefComplaint,
      symptoms,
      medicalHistory,
      currentMedications,
      status,
      transcription,
    } = req.body

    const updateData: any = {
      chiefComplaint,
      symptoms,
      medicalHistory,
      currentMedications,
      status,
      transcription,
    }

    const consultation = await prisma.consultation.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        audioRecordings: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    res.json(consultation)
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar consulta', message: error.message })
  }
})

// DELETE /api/consultations/:consultationId/audios/:audioId - Deletar áudio específico
router.delete('/:consultationId/audios/:audioId', async (req, res) => {
  try {
    const { consultationId, audioId } = req.params

    const audio = await prisma.consultationAudio.findFirst({
      where: {
        id: audioId,
        consultationId,
      },
    })

    if (!audio) {
      return res.status(404).json({ error: 'Registro de áudio não encontrado' })
    }

    if (audio.fileUrl) {
      try {
        await fs.unlink(audio.fileUrl)
      } catch (error) {
        console.error('Erro ao deletar arquivo de áudio:', error)
      }
    }

    await prisma.consultationAudio.delete({
      where: { id: audioId },
    })

    res.json({ success: true, message: 'Áudio removido com sucesso' })
  } catch (error: any) {
    console.error('Erro ao deletar áudio:', error)
    res.status(500).json({ error: 'Erro ao deletar áudio', message: error.message })
  }
})

// DELETE /api/consultations/:id - Deletar consulta
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        audioRecordings: true,
      },
    })

    if (!consultation) {
      return res.status(404).json({ error: 'Consulta não encontrada' })
    }

    // Deletar arquivos de áudio associados
    await Promise.all(
      consultation.audioRecordings.map(async audio => {
        if (audio.fileUrl) {
          try {
            await fs.unlink(audio.fileUrl)
          } catch (error) {
            console.error('Erro ao deletar arquivo de áudio:', error)
          }
        }
      })
    )

    await prisma.consultation.delete({
      where: { id },
    })

    res.json({ success: true, message: 'Consulta deletada com sucesso' })
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao deletar consulta', message: error.message })
  }
})

/**
 * Processa a transcrição do áudio em background
 */
async function processAudioTranscription(audioId: string, audioFilePath: string) {
  try {
    console.log(`[audio:${audioId}] Iniciando transcrição...`)

    const result = await transcribeAudio(audioFilePath)

    await prisma.consultationAudio.update({
      where: { id: audioId },
      data: {
        transcription: result.text,
        duration: result.duration ? Math.round(result.duration) : null,
        transcriptionStatus: 'COMPLETED',
        transcriptionError: null,
      },
    })

    console.log(`[audio:${audioId}] Transcrição concluída com sucesso!`)
  } catch (error: any) {
    console.error(`[audio:${audioId}] Erro na transcrição:`, error)

    await prisma.consultationAudio.update({
      where: { id: audioId },
      data: {
        transcriptionStatus: 'FAILED',
        transcriptionError: error.message,
      },
    })
  }
}

export default router
